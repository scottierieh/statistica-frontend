
import sys
import json
import numpy as np
import pandas as pd
import warnings
import io
import base64
import math

warnings.filterwarnings('ignore')

def _to_native_type(obj):
    if isinstance(obj, dict):
        return {k: _to_native_type(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [_to_native_type(v) for v in obj]
    elif isinstance(obj, (np.integer, int)):
        return int(obj)
    elif isinstance(obj, (np.floating, float)):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return _to_native_type(obj.tolist())
    elif pd.isna(obj):
        return None
    return obj

def generate_interpretation(results: dict) -> str:
    """Generates a detailed text interpretation of the brand funnel analysis with emphasis."""
    insights = results.get('insights')
    if not insights:
        return "Not enough data to generate a full interpretation."

    top_performer = insights.get('top_performer', {})
    market_leader = insights.get('market_leader', {})
    biggest_opportunity = insights.get('biggest_opportunity', {})
    conversion_champion = insights.get('conversion_champion', {})

    interp = f"<strong>Overall Performance:</strong>\nThe analysis reveals distinct performance profiles for each brand. <strong>{top_performer.get('brand', 'N/A')}</strong> emerges as the top performer with the highest overall funnel efficiency of <strong>{top_performer.get('efficiency', 0):.1f}%</strong> from awareness to usage. In terms of market presence, <strong>{market_leader.get('awareness', 'N/A')}</strong> leads in brand awareness, while <strong>{market_leader.get('usage', 'N/A')}</strong> commands the largest share of actual usage.\n\n"

    interp += f"<strong>Conversion Insights:</strong>\n<strong>{conversion_champion.get('brand', 'N/A')}</strong> is the 'Conversion Champion,' successfully converting <strong>{conversion_champion.get('rate', 0):.1f}%</strong> of aware customers into users. This indicates a highly effective marketing and product experience.\n\n"

    interp += f"<strong>Strategic Recommendations:</strong>\nThe biggest opportunity for growth lies with <strong>{biggest_opportunity.get('brand', 'N/A')}</strong>, which sees its most significant customer drop-off at the <strong>'{biggest_opportunity.get('bottleneck', 'N/A')}'</strong> stage. Focusing marketing efforts and product improvements at this specific point could yield the highest return on investment. For other brands, analyzing their respective bottlenecks will reveal the most critical areas for strategic intervention."
    
    return interp.strip()


class BrandFunnelAnalysis:
    """
    Brand Funnel Analysis
    Analyzes brand awareness, consideration, preference, and usage
    """
    
    def __init__(self, brands: list[str], funnel_data: dict[str, dict[str, int]], total_respondents: int):
        """
        Initialize Brand Funnel Analysis
        
        Parameters:
        - brands: List of brand names
        - funnel_data: Dictionary with brand counts for each stage
        - total_respondents: The total number of survey respondents
        """
        self.brands = brands
        self.funnel_data = pd.DataFrame.from_dict(funnel_data, orient='index').reindex(brands).fillna(0).astype(int)
        self.total_respondents = total_respondents
        self.conversion_rates = pd.DataFrame()
        
    def calculate_conversion_rates(self):
        """Calculate conversion rates between funnel stages"""
        if self.funnel_data.empty:
            return pd.DataFrame()
            
        df = self.funnel_data.copy()
        
        rates = pd.DataFrame(index=df.index)
        
        with np.errstate(divide='ignore', invalid='ignore'):
            rates['awareness_to_consideration'] = np.divide(df['consideration'], df['awareness']) * 100
            rates['consideration_to_preference'] = np.divide(df['preference'], df['consideration']) * 100
            rates['preference_to_usage'] = np.divide(df['usage'], df['preference']) * 100
            rates['awareness_to_usage'] = np.divide(df['usage'], df['awareness']) * 100
        
        self.conversion_rates = rates.replace([np.inf, -np.inf], np.nan)
        return self.conversion_rates
    
    def calculate_market_share(self) -> pd.DataFrame:
        """Calculate market share at each funnel stage"""
        market_share = pd.DataFrame(index=self.funnel_data.index)
        
        for stage in ['awareness', 'consideration', 'preference', 'usage']:
            total = self.funnel_data[stage].sum()
            if total > 0:
                market_share[f'{stage}_share'] = (self.funnel_data[stage] / total) * 100
            else:
                market_share[f'{stage}_share'] = 0
        
        return market_share

    def calculate_funnel_efficiency(self) -> pd.DataFrame:
        """Calculate overall funnel efficiency"""
        efficiency = pd.DataFrame(index=self.funnel_data.index)
        with np.errstate(divide='ignore', invalid='ignore'):
            efficiency['funnel_efficiency'] = np.divide(self.funnel_data['usage'], self.funnel_data['awareness']) * 100
        
        efficiency['drop_off_rate'] = 100 - efficiency['funnel_efficiency']
        
        return efficiency.sort_values('funnel_efficiency', ascending=False)
    
    def calculate_drop_off(self) -> dict:
        results = {}
        stages = ['awareness', 'consideration', 'preference', 'usage']
        
        for brand in self.brands:
            if brand not in self.funnel_data.index: continue
            
            brand_drop = {}
            for i in range(len(stages) - 1):
                current_stage = stages[i]
                next_stage = stages[i+1]
                
                current_val = self.funnel_data.loc[brand, current_stage]
                next_val = self.funnel_data.loc[brand, next_stage]
                
                drop_count = int(current_val - next_val)
                drop_rate = (drop_count / current_val * 100) if current_val > 0 else 0
                
                brand_drop[f'{current_stage}_to_{next_stage}'] = {
                    'count': drop_count,
                    'rate': drop_rate
                }
            results[brand] = brand_drop
        return results

    def calculate_health_scores(self) -> dict:
        results = {}
        max_awareness = self.funnel_data['awareness'].max()
        if max_awareness == 0: max_awareness = 1 # Avoid division by zero

        for brand in self.brands:
            if brand not in self.conversion_rates.index: continue
            
            conv_rate = self.conversion_rates.loc[brand, 'awareness_to_usage']
            conv_score = min((conv_rate or 0) * 0.4, 40)
            
            vol_score = (self.funnel_data.loc[brand, 'awareness'] / max_awareness) * 30
            
            rates = [
                self.conversion_rates.loc[brand, 'awareness_to_consideration'],
                self.conversion_rates.loc[brand, 'consideration_to_preference'],
                self.conversion_rates.loc[brand, 'preference_to_usage']
            ]
            valid_rates = [r for r in rates if pd.notna(r)]
            variance = np.var(valid_rates) if len(valid_rates) > 0 else 0
            cons_score = max(0, 30 - (variance / 100))
            
            total_score = conv_score + vol_score + cons_score
            
            results[brand] = {
                'total_score': total_score,
                'conversion_component': conv_score,
                'consistency_component': cons_score,
                'volume_component': vol_score
            }
        return results

    def identify_bottlenecks(self) -> pd.DataFrame:
        """Identify bottleneck stages for each brand"""
        bottlenecks = []
        
        for brand in self.funnel_data.index:
            rates = {
                'Awareness → Consideration': self.conversion_rates.loc[brand, 'awareness_to_consideration'],
                'Consideration → Preference': self.conversion_rates.loc[brand, 'consideration_to_preference'],
                'Preference → Usage': self.conversion_rates.loc[brand, 'preference_to_usage']
            }
            
            valid_rates = {k: v for k, v in rates.items() if pd.notna(v)}
            if not valid_rates: continue

            bottleneck_stage = min(valid_rates, key=valid_rates.get)
            bottleneck_rate = valid_rates[bottleneck_stage]
            
            bottlenecks.append({
                'brand': brand,
                'bottleneck_stage': bottleneck_stage,
                'conversion_rate': bottleneck_rate
            })
        
        return pd.DataFrame(bottlenecks).sort_values('conversion_rate')
    
    def generate_insights(self) -> dict:
        """Generate key insights from the analysis"""
        efficiency_df = self.calculate_funnel_efficiency().where(pd.notnull(self.calculate_funnel_efficiency()), 0)
        bottlenecks_df = self.identify_bottlenecks()
        market_share_df = self.calculate_market_share().where(pd.notnull(self.calculate_market_share()), 0)
        conversion_rates_df = self.conversion_rates.copy().fillna(0)

        insights = {
            'top_performer': {
                'brand': efficiency_df['funnel_efficiency'].idxmax() if not efficiency_df.empty else 'N/A',
                'efficiency': float(efficiency_df['funnel_efficiency'].max()) if not efficiency_df.empty else 0,
                'description': f"{efficiency_df['funnel_efficiency'].idxmax() if not efficiency_df.empty else 'N/A'} has the highest funnel efficiency"
            },
            'market_leader': {
                'awareness': market_share_df['awareness_share'].idxmax() if not market_share_df.empty else 'N/A',
                'usage': market_share_df['usage_share'].idxmax() if not market_share_df.empty else 'N/A',
                'description': f"Market leader in awareness: {market_share_df['awareness_share'].idxmax() if not market_share_df.empty else 'N/A'}, in usage: {market_share_df['usage_share'].idxmax() if not market_share_df.empty else 'N/A'}"
            },
            'biggest_opportunity': {
                'brand': bottlenecks_df.iloc[0]['brand'] if not bottlenecks_df.empty else 'N/A',
                'bottleneck': bottlenecks_df.iloc[0]['bottleneck_stage'] if not bottlenecks_df.empty else 'N/A',
                'rate': float(bottlenecks_df.iloc[0]['conversion_rate']) if not bottlenecks_df.empty else 0,
                'description': f"{bottlenecks_df.iloc[0]['brand'] if not bottlenecks_df.empty else 'N/A'} has the biggest opportunity to improve at {bottlenecks_df.iloc[0]['bottleneck_stage'] if not bottlenecks_df.empty else 'N/A'}"
            },
            'conversion_champion': {
                'brand': conversion_rates_df['awareness_to_usage'].idxmax() if not conversion_rates_df.empty and conversion_rates_df['awareness_to_usage'].notna().any() else 'N/A',
                'rate': float(conversion_rates_df['awareness_to_usage'].max()) if not conversion_rates_df.empty and conversion_rates_df['awareness_to_usage'].notna().any() else 0,
                'description': f"{conversion_rates_df['awareness_to_usage'].idxmax() if not conversion_rates_df.empty and conversion_rates_df['awareness_to_usage'].notna().any() else 'N/A'} has the best overall conversion rate"
            }
        }
        
        return insights
    
    def export_results(self):
        """Export analysis results to JSON-serializable dictionary"""
        self.calculate_conversion_rates()
        
        # market_share 계산 및 변환
        market_share_df = self.calculate_market_share().fillna(0)
        market_share_list = market_share_df.reset_index().rename(columns={'index': 'brand'}).to_dict('records')
        
        results = {
            'funnel_data': self.funnel_data.to_dict('index'),
            'conversion_rates': self.conversion_rates.where(pd.notnull(self.conversion_rates), None).to_dict('index'),
            'market_share': market_share_list,
            'efficiency': self.calculate_funnel_efficiency().where(pd.notnull(self.calculate_funnel_efficiency()), None).to_dict('index'),
            'bottlenecks': self.identify_bottlenecks().to_dict('records'),
            'drop_off': self.calculate_drop_off(),
            'health_scores': self.calculate_health_scores(),
            'insights': self.generate_insights()
        }
        
        results['interpretation'] = generate_interpretation(results)
        return _to_native_type(results)

def main():
    try:
        payload = json.load(sys.stdin)
        brands = payload.get('brands')
        funnel_data = payload.get('funnel_data')
        total_respondents = payload.get('total_respondents')

        if not all([brands, funnel_data, total_respondents is not None]):
            raise ValueError("Missing 'brands', 'funnel_data', or 'total_respondents'")

        analysis = BrandFunnelAnalysis(brands, funnel_data, total_respondents)
        results_to_export = analysis.export_results()

        response = { 'results': results_to_export }
        print(json.dumps(response))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
