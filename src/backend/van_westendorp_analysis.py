
import sys
import json
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from scipy import interpolate
import io
import base64
import warnings

warnings.filterwarnings('ignore')

def _to_native_type(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    return obj

def find_intersection(x, y1, y2):
    """Finds the intersection of two line segments."""
    # This is a simplified approach. A more robust solution would handle multiple intersections.
    try:
        f1 = interpolate.interp1d(x, y1, fill_value="extrapolate")
        f2 = interpolate.interp1d(x, y2, fill_value="extrapolate")
        
        diff = f1(x) - f2(x)
        
        # Find where sign changes
        sign_change_indices = np.where(np.diff(np.sign(diff)))[0]
        
        if len(sign_change_indices) == 0:
            # If no sign change, find the point of minimum difference
            return x[np.argmin(np.abs(diff))]

        # For simplicity, take the first sign change
        idx = sign_change_indices[0]
        
        # Linear interpolation for a more precise intersection point
        x_a, x_b = x[idx], x[idx+1]
        y_a, y_b = diff[idx], diff[idx+1]
        
        if y_a == y_b: return x_a

        return x_a - y_a * (x_b - x_a) / (y_b - y_a)
    except Exception:
        # Fallback if interpolation fails
        diff = np.abs(y1 - y2)
        idx = np.argmin(diff)
        return x[idx]

def generate_interpretation(results):
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

def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        too_cheap_col = payload.get('too_cheap_col')
        cheap_col = payload.get('cheap_col')
        expensive_col = payload.get('expensive_col')
        too_expensive_col = payload.get('too_expensive_col')

        if not all([data, too_cheap_col, cheap_col, expensive_col, too_expensive_col]):
            raise ValueError("Missing required data columns.")

        df = pd.DataFrame(data)
        
        # Ensure all relevant columns are numeric, coercing errors
        price_cols = [too_cheap_col, cheap_col, expensive_col, too_expensive_col]
        for col in price_cols:
            df[col] = pd.to_numeric(df[col], errors='coerce')

        # Drop rows with any NaN values in the price columns
        df.dropna(subset=price_cols, inplace=True)

        if df.shape[0] < 10:
            raise ValueError("Not enough valid numeric responses found for the price sensitivity questions.")

        # Ensure logical consistency
        for i in range(len(df)):
            prices = df.iloc[i][price_cols].values.tolist()
            if not all(x <= y for x, y in zip(prices, prices[1:])):
                sorted_prices = sorted(prices)
                df.iloc[i][price_cols] = sorted_prices

        # --- Analysis Logic from user ---
        price_range = np.linspace(df[price_cols].min().min(), df[price_cols].max().max(), 500)
        n = len(df)

        too_cheap_cumulative = np.array([(df[too_cheap_col] > p).sum() for p in price_range]) / n * 100
        cheap_cumulative = np.array([(df[cheap_col] > p).sum() for p in price_range]) / n * 100
        expensive_cumulative = np.array([(df[expensive_col] <= p).sum() for p in price_range]) / n * 100
        too_expensive_cumulative = np.array([(df[too_expensive_col] <= p).sum() for p in price_range]) / n * 100
        
        not_cheap = 100 - cheap_cumulative
        not_expensive = 100 - expensive_cumulative
        
        pmc_price = find_intersection(price_range, too_cheap_cumulative, not_cheap)
        pme_price = find_intersection(price_range, expensive_cumulative, not_expensive)
        opp_price = find_intersection(price_range, not_cheap, not_expensive)
        idp_price = find_intersection(price_range, cheap_cumulative, expensive_cumulative)
        
        results = {
            'pme': pme_price, # Point of Marginal Expensiveness
            'pmc': pmc_price, # Point of Marginal Cheapness
            'opp': opp_price, # Optimal Price Point
            'idp': idp_price, # Indifference Price Point
        }
        results['interpretation'] = generate_interpretation(results)

        # --- Plotting ---
        fig, ax = plt.subplots(figsize=(10, 6))

        ax.plot(price_range, too_expensive_cumulative, label='Too Expensive', color='red', linewidth=2)
        ax.plot(price_range, expensive_cumulative, label='Expensive', color='orange', linewidth=2)
        ax.plot(price_range, not_cheap, label='Not Cheap', color='blue', linewidth=2)
        ax.plot(price_range, not_too_cheap, label='Not Too Cheap', color='skyblue', linewidth=2, linestyle='--')
        
        # Intersections
        if pme_price: ax.axvline(x=pme_price, color='darkred', linestyle='--', alpha=0.7, label=f'PME: ${pme_price:.2f}')
        if pmc_price: ax.axvline(x=pmc_price, color='darkblue', linestyle='--', alpha=0.7, label=f'PMC: ${pmc_price:.2f}')
        if opp_price: ax.axvline(x=opp_price, color='green', linestyle='-', alpha=0.9, linewidth=2.5, label=f'OPP: ${opp_price:.2f}')
        if idp_price: ax.axvline(x=idp_price, color='purple', linestyle='--', alpha=0.7, label=f'IDP: ${idp_price:.2f}')

        ax.set_xlabel('Price')
        ax.set_ylabel('Percentage of Respondents (%)')
        ax.set_title('Van Westendorp Price Sensitivity Meter')
        ax.legend()
        ax.grid(True, alpha=0.3)
        ax.set_ylim(0, 100)

        buf = io.BytesIO()
        plt.savefig(buf, format='png')
        plt.close(fig)
        buf.seek(0)
        plot_image = base64.b64encode(buf.read()).decode('utf-8')
        
        response = {
            'results': results,
            'plot': f"data:image/png;base64,{plot_image}"
        }

        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
