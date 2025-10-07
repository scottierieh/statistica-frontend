
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
    try:
        f1 = interpolate.interp1d(x, y1, fill_value="extrapolate", bounds_error=False)
        f2 = interpolate.interp1d(x, y2, fill_value="extrapolate", bounds_error=False)
        
        diff = f1(x) - f2(x)
        
        sign_change_indices = np.where(np.diff(np.sign(diff)))[0]
        
        if len(sign_change_indices) == 0:
            idx = np.argmin(np.abs(diff))
            return x[idx]

        idx = sign_change_indices[0]
        
        x_a, x_b = x[idx], x[idx+1]
        y_a, y_b = diff[idx], diff[idx+1]
        
        if y_a == y_b: return x_a

        return x_a - y_a * (x_b - x_a) / (y_b - y_a)
    except Exception:
        diff = np.abs(np.array(y1) - np.array(y2))
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

def create_psm_plot(price_range, cumulative_curves, results):
    fig, ax1 = plt.subplots(figsize=(10, 7))
    
    pmc_price, opp_price, idp_price, pme_price = results.get('pmc'), results.get('opp'), results.get('idp'), results.get('pme')

    # Use the curves as calculated for PSM plot
    ax1.plot(price_range, 100 - cumulative_curves['too_cheap'], label='Not Too Cheap', color='skyblue', linewidth=2, linestyle='--')
    ax1.plot(price_range, 100 - cumulative_curves['cheap'], label='Not Cheap', color='blue', linewidth=2)
    ax1.plot(price_range, cumulative_curves['expensive'], label='Expensive', color='orange', linewidth=2)
    ax1.plot(price_range, cumulative_curves['too_expensive'], label='Too Expensive', color='red', linewidth=2, linestyle='--')

    if pmc_price: ax1.axvline(pmc_price, color='purple', linestyle='--', alpha=0.7, label=f'PMC: ${pmc_price:.2f}')
    if opp_price: ax1.axvline(opp_price, color='green', linestyle='-', linewidth=2, alpha=0.9, label=f'OPP: ${opp_price:.2f}')
    if idp_price: ax1.axvline(idp_price, color='black', linestyle='--', alpha=0.7, label=f'IDP: ${idp_price:.2f}')
    if pme_price: ax1.axvline(pme_price, color='darkred', linestyle='--', alpha=0.7, label=f'PME: ${pme_price:.2f}')

    ax1.set_xlabel('Price ($)')
    ax1.set_ylabel('Cumulative Percentage (%)')
    ax1.set_title('Van Westendorp Price Sensitivity Meter (PSM)')
    ax1.legend(loc='best')
    ax1.grid(True, alpha=0.3)
    ax1.set_ylim(0, 100)

    plt.tight_layout()
    buf = io.BytesIO()
    plt.savefig(buf, format='png')
    plt.close(fig)
    buf.seek(0)
    return base64.b64encode(buf.read()).decode('utf-8')

def create_acceptance_plot(price_range, too_cheap_cumulative, too_expensive_cumulative):
    not_too_cheap = 100 - too_cheap_cumulative
    not_too_expensive = 100 - too_expensive_cumulative
    acceptance = np.minimum(not_too_cheap, not_too_expensive)
    max_acceptance_idx = np.argmax(acceptance)
    max_acceptance_price = price_range[max_acceptance_idx]
    max_acceptance_pct = acceptance[max_acceptance_idx]
    
    fig, ax2 = plt.subplots(figsize=(10, 7))

    ax2.plot(price_range, not_too_cheap, label='Not Too Cheap', color='blue', linewidth=2, linestyle='--')
    ax2.plot(price_range, not_too_expensive, label='Not Too Expensive', color='red', linewidth=2, linestyle='--')
    ax2.fill_between(price_range, 0, acceptance, alpha=0.3, color='green', label='Acceptable Range')
    ax2.plot(price_range, acceptance, color='green', linewidth=3, label='Acceptance Curve')

    ax2.scatter([max_acceptance_price], [max_acceptance_pct], s=200, c='green', marker='*', 
               zorder=5, edgecolors='black', linewidth=1.5)
    ax2.annotate(f'Max Acceptance\n${max_acceptance_price:.2f}\n({max_acceptance_pct:.1f}%)', 
                (max_acceptance_price, max_acceptance_pct),
                xytext=(max_acceptance_price + 5, max_acceptance_pct - 15), fontsize=10, fontweight='bold',
                bbox=dict(boxstyle='round,pad=0.5', facecolor='lightgreen', alpha=0.7))

    ax2.set_xlabel('Price ($)')
    ax2.set_ylabel('Acceptance Percentage (%)')
    ax2.set_title('Price Acceptance Curve')
    ax2.legend(loc='best')
    ax2.grid(True, alpha=0.3)
    ax2.set_ylim(0, 100)
    
    plt.tight_layout()
    buf = io.BytesIO()
    plt.savefig(buf, format='png')
    plt.close(fig)
    buf.seek(0)
    return base64.b64encode(buf.read()).decode('utf-8')

def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        too_cheap_col = payload.get('too_cheap_col')
        cheap_col = payload.get('cheap_col')
        expensive_col = payload.get('expensive_col')
        too_expensive_col = payload.get('too_expensive_col')

        if not data:
            raise ValueError("Missing required data columns.")

        df = pd.DataFrame(data)
        
        price_cols = [too_cheap_col, cheap_col, expensive_col, too_expensive_col]
        for col in price_cols:
            df[col] = pd.to_numeric(df[col], errors='coerce')

        df.dropna(subset=price_cols, inplace=True)

        if df.shape[0] < 10:
            raise ValueError("No valid numeric responses found for the price sensitivity questions.")

        for i in range(len(df)):
            prices = df.iloc[i][price_cols].values.tolist()
            if not all(x <= y for x, y in zip(prices, prices[1:])):
                sorted_prices = sorted(prices)
                df.iloc[i][price_cols] = sorted_prices

        price_range = np.linspace(df[price_cols].values.min(), df[price_cols].values.max(), 500)
        n = len(df)
        
        # 'Too Cheap' / 'Cheap': % of people who think price is at or ABOVE this level
        too_cheap_cumulative = np.array([(df[too_cheap_col] >= p).sum() for p in price_range]) / n * 100
        cheap_cumulative = np.array([(df[cheap_col] >= p).sum() for p in price_range]) / n * 100

        # 'Expensive' / 'Too Expensive': % of people who think price is at or BELOW this level
        expensive_cumulative = np.array([(df[expensive_col] <= p).sum() for p in price_range]) / n * 100
        too_expensive_cumulative = np.array([(df[too_expensive_col] <= p).sum() for p in price_range]) / n * 100
        
        not_cheap = 100 - cheap_cumulative
        not_expensive = 100 - expensive_cumulative
        
        pmc_price = find_intersection(price_range, too_cheap_cumulative, not_cheap)
        pme_price = find_intersection(price_range, expensive_cumulative, not_expensive)
        opp_price = find_intersection(price_range, not_cheap, expensive_cumulative) 
        idp_price = find_intersection(price_range, cheap_cumulative, not_expensive)
        
        results = {
            'pme': pme_price,
            'pmc': pmc_price,
            'opp': opp_price,
            'idp': idp_price,
        }
        results['interpretation'] = generate_interpretation(results)
        
        cumulative_curves_for_psm = {
            'too_cheap': too_cheap_cumulative,
            'cheap': cheap_cumulative,
            'expensive': expensive_cumulative,
            'too_expensive': too_expensive_cumulative
        }
        
        psm_plot = create_psm_plot(price_range, cumulative_curves_for_psm, results)

        acceptance_plot = create_acceptance_plot(price_range, too_cheap_cumulative, too_expensive_cumulative)

        response = {
            'results': results,
            'plots': {
                'psm_plot': psm_plot,
                'acceptance_plot': acceptance_plot,
            }
        }

        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
