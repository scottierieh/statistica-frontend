
import sys
import json
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import io
import base64
import warnings

# Van Westendorp PSM 패키지 import
try:
    import VanWestendorp_PriceSensitivityMeter as VWPSM
except ImportError:
    print(json.dumps({"error": "VanWestendorp_PriceSensitivityMeter package not installed. Please install it using: pip install VanWestendorp-PriceSensitivityMeter"}), file=sys.stderr)
    sys.exit(1)

warnings.filterwarnings('ignore')

def _to_native_type(obj):
    """Convert numpy types to native Python types for JSON serialization"""
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    return obj

def generate_interpretation(results):
    """Generate strategic pricing interpretation based on PSM results"""
    rap_lower = results.get('pmc')
    rap_upper = results.get('pme')
    opp = results.get('opp')
    idp = results.get('idp')

    if any(val is None for val in [rap_lower, rap_upper, opp, idp]):
        return "Could not determine all price points. Check data quality and distribution."

    interpretation = (
        f"The analysis identifies a recommended price range between **${rap_lower:.2f}** (Point of Marginal Cheapness) and **${rap_upper:.2f}** (Point of Marginal Expensiveness).\n\n"
        f"- **Optimal Price Point (OPP): ${opp:.2f}**\nThis is often considered the best price, as it minimizes the number of customers who find the product too cheap or too expensive.\n\n"
        f"- **Indifference Price Point (IDP): ${idp:.2f}**\nAt this price, an equal number of customers consider the product 'cheap' as consider it 'expensive'. It represents a neutral value perception.\n\n"
        f"**Strategic Pricing:**\n"
        f"- For a **premium brand image**, pricing between the IDP (${idp:.2f}) and PME (${rap_upper:.2f}) is recommended.\n"
        f"- For a **value-oriented market penetration strategy**, pricing between the PMC (${rap_lower:.2f}) and IDP (${idp:.2f}) is suitable.\n\n"
        f"Pricing below **${rap_lower:.2f}** risks being perceived as low quality, while pricing above **${rap_upper:.2f}** will likely meet significant customer resistance."
    )
    return interpretation.strip()

def save_plot_to_base64(fig):
    """Convert matplotlib figure to base64 encoded string"""
    buf = io.BytesIO()
    fig.savefig(buf, format='png', dpi=100, bbox_inches='tight')
    buf.seek(0)
    img_base64 = base64.b64encode(buf.read()).decode('utf-8')
    buf.close()
    plt.close(fig)
    return img_base64

def main():
    try:
        # Read input data from stdin
        payload = json.load(sys.stdin)
        data = payload.get('data')
        too_cheap_col = payload.get('too_cheap_col', 'Too Cheap')
        cheap_col = payload.get('cheap_col', 'Cheap')
        expensive_col = payload.get('expensive_col', 'Expensive')
        too_expensive_col = payload.get('too_expensive_col', 'Too Expensive')

        if not data:
            raise ValueError("Missing required data.")

        # Create DataFrame
        df = pd.DataFrame(data)
        
        # Define column order for Van Westendorp
        price_cols = [too_cheap_col, cheap_col, expensive_col, too_expensive_col]
        
        # Validate columns exist
        for col in price_cols:
            if col not in df.columns:
                raise ValueError(f"Required column '{col}' not found in data.")
        
        # Clean and prepare data
        for col in price_cols:
            df[col] = pd.to_numeric(df[col], errors='coerce')
        
        # Remove rows with any NaN values in price columns
        df_clean = df[price_cols].dropna()
        
        if df_clean.shape[0] < 10:
            raise ValueError(f"Need at least 10 complete responses, but found {df_clean.shape[0]}.")
        
        # Validate price ordering (too_cheap <= cheap <= expensive <= too_expensive)
        for idx in df_clean.index:
            prices = df_clean.loc[idx, price_cols].values
            if not all(prices[i] <= prices[i+1] for i in range(len(prices)-1)):
                # Sort prices if they're out of order
                df_clean.loc[idx, price_cols] = sorted(prices)
        
        # Use VanWestendorp_PriceSensitivityMeter package
        try:
            # Call the VWPSM.results function with the cleaned data
            vw_results = VWPSM.results(df_clean, price_cols)
            
            # Extract key price points from the package results
            opp = getattr(vw_results, 'optimal_price_point', None)
            idp = getattr(vw_results, 'indifference_price_point', None)
            pmc = getattr(vw_results, 'point_of_marginal_cheapness', None)
            pme = getattr(vw_results, 'point_of_marginal_expensiveness', None)
            
            # If the package provides a plot method, use it
            plots = {}
            if hasattr(vw_results, 'plot'):
                fig = vw_results.plot
                plots['psm_plot'] = save_plot_to_base64(fig)
            
            # Prepare results dictionary
            results = {
                'pme': _to_native_type(pme),
                'pmc': _to_native_type(pmc),
                'opp': _to_native_type(opp),
                'idp': _to_native_type(idp),
            }
            
            # Add interpretation
            results['interpretation'] = generate_interpretation(results)
            
            # Prepare response
            response = {
                'results': results,
                'plots': plots,
                'summary': {
                    'total_responses': len(df_clean),
                    'price_range': {
                        'min': float(df_clean[price_cols].min().min()),
                        'max': float(df_clean[price_cols].max().max())
                    }
                }
            }
            
            print(json.dumps(response, default=_to_native_type))
            
        except Exception as e:
            # If the package fails, provide informative error
            error_msg = f"Error using VanWestendorp_PriceSensitivityMeter package: {str(e)}"
            print(json.dumps({"error": error_msg}), file=sys.stderr)
            sys.exit(1)

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
