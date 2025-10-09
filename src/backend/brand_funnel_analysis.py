
import sys
import json
import pandas as pd
import numpy as np
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
    
    def __init__(self, brands: list[str]):
        """
        Initialize Brand Funnel Analysis
        
        Parameters:
        - brands: List of brand names
        """
        self.brands = brands
        self.n_brands = len(brands)
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
        
        # Safely calculate conversion rates, avoiding division by zero by using np.divide
        with np.errstate(divide='ignore', invalid='ignore'):
            self.conversion_rates['awareness_to_consideration'] = np.divide(df['consideration'], df['awareness']) * 100
            self.conversion_rates['consideration_to_preference'] = np.divide(df['preference'], df['consideration']) * 100
            self.conversion_rates['preference_to_usage'] = np.divide(df['usage'], df['preference']) * 100
            self.conversion_rates['awareness_to_usage'] = np.divide(df['usage'], df['awareness']) * 100
        
        # Replace NaN and Inf with None for JSON compatibility later
        self.conversion_rates.replace([np.inf, -np.inf], np.nan, inplace=True)


def main():
    try:
        payload = json.load(sys.stdin)
        brands = payload.get('brands')
        funnel_data = payload.get('funnel_data')

        if not all([brands, funnel_data]):
            raise ValueError("Missing 'brands' or 'funnel_data'")

        analysis = BrandFunnelAnalysis(brands)
        analysis.set_data(funnel_data)
        
        # Ensure no infinity values in the final conversion rates DataFrame
        if analysis.conversion_rates is not None:
            # Replace NaN with None before converting to dict
            conversion_rates_dict = analysis.conversion_rates.where(pd.notnull(analysis.conversion_rates), None).to_dict()
        else:
            conversion_rates_dict = {}

        results_to_export = {
            'funnel_data': analysis.funnel_data.to_dict() if analysis.funnel_data is not None else {},
            'conversion_rates': conversion_rates_dict,
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
