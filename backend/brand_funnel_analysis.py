
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
        self.funnel_data = pd.DataFrame(funnel_data).T.reindex(brands).fillna(0).astype(int)
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
        efficiency = self.calculate_funnel_efficiency().where(pd.notnull(self.calculate_funnel_efficiency()), 0)
        bottlenecks = self.identify_bottlenecks()
        market_share = self.calculate_market_share().where(pd.notnull(self.calculate_market_share()), 0)
        
        insights = {
            'top_performer': {
                'brand': efficiency.index[0] if not efficiency.empty else 'N/A',
                'efficiency': float(efficiency.iloc[0]['funnel_efficiency']) if not efficiency.empty else 0,
                'description': f"{efficiency.index[0] if not efficiency.empty else 'N/A'} has the highest funnel efficiency"
            },
            'market_leader': {
                'awareness': market_share['awareness_share'].idxmax() if not market_share.empty else 'N/A',
                'usage': market_share['usage_share'].idxmax() if not market_share.empty else 'N/A',
                'description': f"Market leader in awareness: {market_share['awareness_share'].idxmax() if not market_share.empty else 'N/A'}, in usage: {market_share['usage_share'].idxmax() if not market_share.empty else 'N/A'}"
            },
            'biggest_opportunity': {
                'brand': bottlenecks.iloc[0]['brand'] if not bottlenecks.empty else 'N/A',
                'bottleneck': bottlenecks.iloc[0]['bottleneck_stage'] if not bottlenecks.empty else 'N/A',
                'rate': float(bottlenecks.iloc[0]['conversion_rate']) if not bottlenecks.empty else 0,
                'description': f"{bottlenecks.iloc[0]['brand'] if not bottlenecks.empty else 'N/A'} has the biggest opportunity to improve at {bottlenecks.iloc[0]['bottleneck_stage'] if not bottlenecks.empty else 'N/A'}"
            },
            'conversion_champion': {
                'brand': self.conversion_rates['awareness_to_usage'].idxmax() if not self.conversion_rates.empty and self.conversion_rates['awareness_to_usage'].notna().any() else 'N/A',
                'rate': float(self.conversion_rates['awareness_to_usage'].max()) if not self.conversion_rates.empty and self.conversion_rates['awareness_to_usage'].notna().any() else 0,
                'description': f"{self.conversion_rates['awareness_to_usage'].idxmax() if not self.conversion_rates.empty and self.conversion_rates['awareness_to_usage'].notna().any() else 'N/A'} has the best overall conversion rate"
            }
        }
        
        return insights
    
    def export_results(self):
        """Export analysis results to JSON-serializable dictionary"""
        self.calculate_conversion_rates()
        results = {
            'funnel_data': self.funnel_data.to_dict('index'),
            'conversion_rates': self.conversion_rates.where(pd.notnull(self.conversion_rates), None).to_dict('index'),
            'market_share': self.calculate_market_share().where(pd.notnull(self.calculate_market_share()), None).to_dict('index'),
            'efficiency': self.calculate_funnel_efficiency().where(pd.notnull(self.calculate_funnel_efficiency()), None).to_dict('index'),
            'bottlenecks': self.identify_bottlenecks().to_dict('records'),
            'drop_off': self.calculate_drop_off(),
            'health_scores': self.calculate_health_scores(),
            'insights': self.generate_insights()
        }
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
