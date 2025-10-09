
import sys
import json
import numpy as np
import pandas as pd
import warnings
import io
import base64

warnings.filterwarnings('ignore')

def _to_native_type(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, (np.floating, float)):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    return obj

class BrandFunnelAnalysis:
    """
    Brand Funnel Analysis
    Analyzes brand awareness, consideration, preference, and usage
    """
    
    def __init__(self, brands: list[str], total_respondents: int):
        """
        Initialize Brand Funnel Analysis
        
        Parameters:
        - brands: List of brand names
        - total_respondents: The total number of survey respondents
        """
        self.brands = brands
        self.n_brands = len(brands)
        self.total_respondents = total_respondents
        self.funnel_data = None
        self.conversion_rates = None
        
    def set_data(self, data: dict[str, dict[str, int]]):
        """
        Set funnel data
        
        Parameters:
        - data: Dictionary with structure:
          {
              'brand_name': {
                  'awareness': count,
                  'consideration': count,
                  'preference': count,
                  'usage': count
              }
          }
        """
        self.funnel_data = pd.DataFrame(data).T
        if not self.funnel_data.empty:
            self.funnel_data = self.funnel_data[['awareness', 'consideration', 'preference', 'usage']]
        self.calculate_conversion_rates()
        
    def calculate_conversion_rates(self):
        """Calculate conversion rates between funnel stages"""
        if self.funnel_data is None or self.funnel_data.empty:
            self.conversion_rates = pd.DataFrame()
            return
            
        df = self.funnel_data.copy()
        
        # Conversion rates
        self.conversion_rates = pd.DataFrame(index=df.index)
        
        with np.errstate(divide='ignore', invalid='ignore'):
            self.conversion_rates['awareness_to_consideration'] = np.divide(df['consideration'], df['awareness']) * 100
            self.conversion_rates['consideration_to_preference'] = np.divide(df['preference'], df['consideration']) * 100
            self.conversion_rates['preference_to_usage'] = np.divide(df['usage'], df['preference']) * 100
            self.conversion_rates['awareness_to_usage'] = np.divide(df['usage'], df['awareness']) * 100
        
        self.conversion_rates.replace([np.inf, -np.inf], np.nan, inplace=True)
        
    def get_funnel_summary(self) -> pd.DataFrame:
        """Get summary statistics for each brand"""
        summary = self.funnel_data.copy()
        summary['total_respondents'] = self.total_respondents
        summary['awareness_rate'] = (
            self.funnel_data['awareness'] / summary['total_respondents'] * 100
        )
        summary['usage_rate'] = (
            self.funnel_data['usage'] / summary['total_respondents'] * 100
        )
        
        return summary
    
    def calculate_funnel_efficiency(self) -> pd.DataFrame:
        """Calculate overall funnel efficiency"""
        efficiency = pd.DataFrame(index=self.funnel_data.index)
        with np.errstate(divide='ignore', invalid='ignore'):
            efficiency['funnel_efficiency'] = np.divide(self.funnel_data['usage'], self.funnel_data['awareness']) * 100
        
        efficiency['drop_off_rate'] = 100 - efficiency['funnel_efficiency']
        
        return efficiency.sort_values('funnel_efficiency', ascending=False)
    
    def identify_bottlenecks(self) -> pd.DataFrame:
        """Identify bottleneck stages for each brand"""
        bottlenecks = []
        
        for brand in self.funnel_data.index:
            rates = {
                'Awareness → Consideration': self.conversion_rates.loc[brand, 'awareness_to_consideration'],
                'Consideration → Preference': self.conversion_rates.loc[brand, 'consideration_to_preference'],
                'Preference → Usage': self.conversion_rates.loc[brand, 'preference_to_usage']
            }
            
            # Filter out NaN values before finding the minimum
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
    
    def calculate_market_share(self) -> pd.DataFrame:
        """Calculate market share at each funnel stage"""
        market_share = pd.DataFrame()
        
        for stage in ['awareness', 'consideration', 'preference', 'usage']:
            total = self.funnel_data[stage].sum()
            if total > 0:
                market_share[f'{stage}_share'] = (
                    self.funnel_data[stage] / total * 100
                )
            else:
                market_share[f'{stage}_share'] = 0
        
        return market_share
    
    def generate_insights(self) -> dict:
        """Generate key insights from the analysis"""
        efficiency = self.calculate_funnel_efficiency().fillna(0)
        bottlenecks = self.identify_bottlenecks()
        market_share = self.calculate_market_share().fillna(0)
        
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
                'brand': self.conversion_rates['awareness_to_usage'].idxmax() if not self.conversion_rates.empty else 'N/A',
                'rate': float(self.conversion_rates['awareness_to_usage'].max()) if not self.conversion_rates.empty else 0,
                'description': f"{self.conversion_rates['awareness_to_usage'].idxmax() if not self.conversion_rates.empty else 'N/A'} has the best overall conversion rate"
            }
        }
        
        return insights
    
    def export_results(self):
        """Export analysis results to JSON-serializable dictionary"""
        conversion_rates_dict = self.conversion_rates.where(pd.notnull(self.conversion_rates), None).to_dict() if self.conversion_rates is not None else {}
        
        results = {
            'funnel_data': self.funnel_data.to_dict(),
            'conversion_rates': conversion_rates_dict,
            'market_share': self.calculate_market_share().fillna(0).to_dict(),
            'efficiency': self.calculate_funnel_efficiency().fillna(0).to_dict(),
            'bottlenecks': self.identify_bottlenecks().to_dict('records'),
            'insights': self.generate_insights()
        }
        return results

def main():
    try:
        payload = json.load(sys.stdin)
        brands = payload.get('brands')
        funnel_data = payload.get('funnel_data')
        total_respondents = payload.get('total_respondents')

        if not all([brands, funnel_data, total_respondents is not None]):
            raise ValueError("Missing 'brands', 'funnel_data', or 'total_respondents'")

        analysis = BrandFunnelAnalysis(brands, total_respondents)
        analysis.set_data(funnel_data)
        
        results_to_export = analysis.export_results()

        response = {
            'results': results_to_export
        }

        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()

