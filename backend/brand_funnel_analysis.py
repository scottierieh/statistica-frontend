
import sys
import json
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from typing import Dict, List, Tuple
import io
import base64

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
    
    def __init__(self, brands: List[str]):
        """
        Initialize Brand Funnel Analysis
        
        Parameters:
        - brands: List of brand names
        """
        self.brands = brands
        self.n_brands = len(brands)
        self.funnel_data = None
        self.conversion_rates = None
        
    def set_data(self, data: Dict[str, Dict[str, int]]):
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
        self.funnel_data = self.funnel_data[['awareness', 'consideration', 'preference', 'usage']]
        self.calculate_conversion_rates()
        
    def calculate_conversion_rates(self):
        """Calculate conversion rates between funnel stages"""
        df = self.funnel_data.copy()
        
        # Conversion rates
        self.conversion_rates = pd.DataFrame(index=df.index)
        self.conversion_rates['awareness_to_consideration'] = (
            df['consideration'] / df['awareness'] * 100
        ).fillna(0)
        self.conversion_rates['consideration_to_preference'] = (
            df['preference'] / df['consideration'] * 100
        ).fillna(0)
        self.conversion_rates['preference_to_usage'] = (
            df['usage'] / df['preference'] * 100
        ).fillna(0)
        self.conversion_rates['awareness_to_usage'] = (
            df['usage'] / df['awareness'] * 100
        ).fillna(0)
        
    def get_funnel_summary(self) -> pd.DataFrame:
        """Get summary statistics for each brand"""
        summary = self.funnel_data.copy()
        if not summary.empty:
            summary['total_respondents'] = self.funnel_data['awareness'].sum()
            summary['awareness_rate'] = (
                self.funnel_data['awareness'] / summary['total_respondents'].iloc[0] * 100
            ) if summary['total_respondents'].iloc[0] > 0 else 0
            summary['usage_rate'] = (
                self.funnel_data['usage'] / summary['total_respondents'].iloc[0] * 100
            ) if summary['total_respondents'].iloc[0] > 0 else 0
        
        return summary
    
    def calculate_funnel_efficiency(self) -> pd.DataFrame:
        """Calculate overall funnel efficiency"""
        efficiency = pd.DataFrame(index=self.funnel_data.index)
        efficiency['funnel_efficiency'] = (
            self.funnel_data['usage'] / self.funnel_data['awareness'] * 100
        ).fillna(0)
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
            
            bottleneck_stage = min(rates, key=rates.get)
            bottleneck_rate = rates[bottleneck_stage]
            
            bottlenecks.append({
                'brand': brand,
                'bottleneck_stage': bottleneck_stage,
                'conversion_rate': bottleneck_rate,
                'all_rates': rates
            })
        
        return pd.DataFrame(bottlenecks).sort_values('conversion_rate')
    
    def calculate_market_share(self) -> pd.DataFrame:
        """Calculate market share at each funnel stage"""
        market_share = pd.DataFrame()
        
        for stage in ['awareness', 'consideration', 'preference', 'usage']:
            total = self.funnel_data[stage].sum()
            market_share[f'{stage}_share'] = (
                self.funnel_data[stage] / total * 100
            ).fillna(0)
        
        return market_share
    
    def generate_insights(self) -> Dict:
        """Generate key insights from the analysis"""
        efficiency = self.calculate_funnel_efficiency()
        bottlenecks = self.identify_bottlenecks()
        market_share = self.calculate_market_share()
        
        insights = {
            'top_performer': {
                'brand': efficiency.index[0],
                'efficiency': float(efficiency.iloc[0]['funnel_efficiency']),
                'description': f"{efficiency.index[0]} has the highest funnel efficiency"
            },
            'market_leader': {
                'awareness': market_share['awareness_share'].idxmax(),
                'usage': market_share['usage_share'].idxmax(),
                'description': f"Market leader in awareness: {market_share['awareness_share'].idxmax()}, in usage: {market_share['usage_share'].idxmax()}"
            },
            'biggest_opportunity': {
                'brand': bottlenecks.iloc[-1]['brand'],
                'bottleneck': bottlenecks.iloc[-1]['bottleneck_stage'],
                'rate': float(bottlenecks.iloc[-1]['conversion_rate']),
                'description': f"{bottlenecks.iloc[-1]['brand']} has the biggest opportunity to improve at {bottlenecks.iloc[-1]['bottleneck_stage']}"
            },
            'conversion_champion': {
                'brand': self.conversion_rates['awareness_to_usage'].idxmax(),
                'rate': float(self.conversion_rates['awareness_to_usage'].max()),
                'description': f"{self.conversion_rates['awareness_to_usage'].idxmax()} has the best overall conversion rate"
            }
        }
        
        return insights

def main():
    try:
        payload = json.load(sys.stdin)
        brands = payload.get('brands')
        funnel_data = payload.get('funnel_data')

        if not all([brands, funnel_data]):
            raise ValueError("Missing 'brands' or 'funnel_data'")

        analysis = BrandFunnelAnalysis(brands)
        analysis.set_data(funnel_data)

        results_to_export = {
            'funnel_data': analysis.funnel_data.to_dict(),
            'conversion_rates': analysis.conversion_rates.to_dict(),
            'market_share': analysis.calculate_market_share().to_dict(),
            'efficiency': analysis.calculate_funnel_efficiency().to_dict(),
            'bottlenecks': analysis.identify_bottlenecks().to_dict('records'),
            'insights': analysis.generate_insights()
        }

        response = {
            'results': results_to_export
        }

        print(json.dumps(response, default=_to_native_type, indent=2))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
