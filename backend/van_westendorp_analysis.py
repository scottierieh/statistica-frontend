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

# Try to import VWPSM package (optional)
try:
    import VanWestendorp_PriceSensitivityMeter as VWPSM
    HAS_VWPSM = True
except ImportError:
    HAS_VWPSM = False

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
    elif pd.isna(obj):
        return None
    return obj

def find_intersection(x, y1, y2):
    """Find intersection point of two curves"""
    try:
        # Create interpolation functions
        f1 = interpolate.interp1d(x, y1, kind='linear', fill_value='extrapolate', bounds_error=False)
        f2 = interpolate.interp1d(x, y2, kind='linear', fill_value='extrapolate', bounds_error=False)
        
        # Find where curves cross
        diff = f1(x) - f2(x)
        sign_changes = np.where(np.diff(np.sign(diff)))[0]
        
        if len(sign_changes) == 0:
            # No intersection found, return point of minimum difference
            idx = np.argmin(np.abs(diff))
            return x[idx]
        
        # Use first intersection point
        idx = sign_changes[0]
        
        # Linear interpolation for precise intersection
        x1, x2 = x[idx], x[idx + 1]
        y1_1, y1_2 = f1(x1), f1(x2)
        y2_1, y2_2 = f2(x1), f2(x2)
        
        # Solve for intersection
        if (y1_2 - y1_1) - (y2_2 - y2_1) == 0:
            return x1
        
        t = (y2_1 - y1_1) / ((y1_2 - y1_1) - (y2_2 - y2_1))
        return x1 + t * (x2 - x1)
        
    except Exception:
        # Fallback: find minimum difference
        diff = np.abs(np.array(y1) - np.array(y2))
        idx = np.argmin(diff)
        return x[idx]

def calculate_vw_curves(df, price_cols, price_range):
    """Calculate Van Westendorp cumulative curves"""
    too_cheap_col, cheap_col, expensive_col, too_expensive_col = price_cols
    n = len(df)
    
    # Calculate cumulative distributions
    # "Too cheap" and "Cheap" are cumulative from low to high
    # "Expensive" and "Too expensive" are cumulative from low to high
    too_cheap_cum = np.array([(df[too_cheap_col] <= p).sum() for p in price_range]) / n * 100
    cheap_cum = np.array([(df[cheap_col] <= p).sum() for p in price_range]) / n * 100
    expensive_cum = np.array([(df[expensive_col] <= p).sum() for p in price_range]) / n * 100
    too_expensive_cum = np.array([(df[too_expensive_col] <= p).sum() for p in price_range]) / n * 100
    
    # Calculate inverse curves (100% - cumulative)
    not_too_cheap = 100 - too_cheap_cum
    not_cheap = 100 - cheap_cum
    not_expensive = 100 - expensive_cum
    not_too_expensive = 100 - too_expensive_cum
    
    return {
        'too_cheap': too_cheap_cum,
        'cheap': cheap_cum,
        'expensive': expensive_cum,
        'too_expensive': too_expensive_cum,
        'not_too_cheap': not_too_cheap,
        'not_cheap': not_cheap,
        'not_expensive': not_expensive,
        'not_too_expensive': not_too_expensive
    }

def calculate_price_points(price_range, curves):
    """Calculate Van Westendorp price points from curves"""
    # PMC: Point of Marginal Cheapness = intersection of "Too Cheap" and "Not Cheap"
    pmc = find_intersection(price_range, curves['too_cheap'], curves['not_cheap'])
    
    # PME: Point of Marginal Expensiveness = intersection of "Not Expensive" and "Too Expensive"
    pme = find_intersection(price_range, curves['not_expensive'], curves['too_expensive'])
    
    # OPP: Optimal Price Point = intersection of "Too Cheap" and "Too Expensive"
    opp = find_intersection(price_range, curves['too_cheap'], curves['too_expensive'])
    
    # IDP: Indifference Price Point = intersection of "Cheap" and "Expensive"
    idp = find_intersection(price_range, curves['cheap'], curves['expensive'])
    
    return {
        'pmc': float(pmc),
        'pme': float(pme),
        'opp': float(opp),
        'idp': float(idp)
    }

def create_psm_plot(price_range, curves, results):
    """Create Van Westendorp PSM plot"""
    fig, ax = plt.subplots(figsize=(12, 8))
    
    # Plot the four main curves
    ax.plot(price_range, curves['too_cheap'], label='Too Cheap', color='#2E86AB', linewidth=2.5, linestyle='-')
    ax.plot(price_range, curves['not_cheap'], label='Not Cheap', color='#A23B72', linewidth=2.5, linestyle='--')
    ax.plot(price_range, curves['expensive'], label='Expensive', color='#F18F01', linewidth=2.5, linestyle='--')
    ax.plot(price_range, curves['too_expensive'], label='Too Expensive', color='#C73E1D', linewidth=2.5, linestyle='-')
    
    # Add vertical lines for price points
    if results['pmc']:
        ax.axvline(results['pmc'], color='#2E86AB', linestyle=':', alpha=0.7, linewidth=2)
        ax.text(results['pmc'], ax.get_ylim()[1] * 0.95, f'PMC\n${results["pmc"]:.2f}', 
                ha='center', fontsize=9, bbox=dict(boxstyle='round,pad=0.3', facecolor='white', alpha=0.8))
    
    if results['pme']:
        ax.axvline(results['pme'], color='#C73E1D', linestyle=':', alpha=0.7, linewidth=2)
        ax.text(results['pme'], ax.get_ylim()[1] * 0.95, f'PME\n${results["pme"]:.2f}', 
                ha='center', fontsize=9, bbox=dict(boxstyle='round,pad=0.3', facecolor='white', alpha=0.8))
    
    if results['opp']:
        ax.axvline(results['opp'], color='green', linestyle='-', alpha=0.9, linewidth=3)
        ax.text(results['opp'], ax.get_ylim()[1] * 0.85, f'OPP\n${results["opp"]:.2f}', 
                ha='center', fontsize=10, fontweight='bold',
                bbox=dict(boxstyle='round,pad=0.3', facecolor='lightgreen', alpha=0.9))
    
    if results['idp']:
        ax.axvline(results['idp'], color='purple', linestyle=':', alpha=0.7, linewidth=2)
        ax.text(results['idp'], ax.get_ylim()[1] * 0.75, f'IDP\n${results["idp"]:.2f}', 
                ha='center', fontsize=9, bbox=dict(boxstyle='round,pad=0.3', facecolor='white', alpha=0.8))
    
    # Formatting
    ax.set_xlabel('Price ($)', fontsize=12)
    ax.set_ylabel('Percentage of Respondents (%)', fontsize=12)
    ax.set_title('Van Westendorp Price Sensitivity Meter', fontsize=14, fontweight='bold')
    ax.legend(loc='best', fontsize=10)
    ax.grid(True, alpha=0.3, linestyle='-', linewidth=0.5)
    ax.set_ylim(0, 100)
    ax.set_xlim(price_range.min(), price_range.max())
    
    # Tight layout
    plt.tight_layout()
    
    # Convert to base64
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=100, bbox_inches='tight')
    buf.seek(0)
    img_base64 = base64.b64encode(buf.read()).decode('utf-8')
    buf.close()
    plt.close(fig)
    
    return img_base64

def create_acceptance_plot(price_range, curves):
    """Create price acceptance curve plot"""
    fig, ax = plt.subplots(figsize=(12, 8))
    
    # Calculate acceptance curve (people who think it's neither too cheap nor too expensive)
    acceptance = np.minimum(curves['not_too_cheap'], curves['not_too_expensive'])
    
    # Find maximum acceptance point
    max_idx = np.argmax(acceptance)
    max_price = price_range[max_idx]
    max_acceptance = acceptance[max_idx]
    
    # Plot curves
    ax.plot(price_range, curves['not_too_cheap'], label='Not Too Cheap', 
            color='#2E86AB', linewidth=2, linestyle='--', alpha=0.7)
    ax.plot(price_range, curves['not_too_expensive'], label='Not Too Expensive', 
            color='#C73E1D', linewidth=2, linestyle='--', alpha=0.7)
    ax.plot(price_range, acceptance, label='Acceptable Price Range', 
            color='green', linewidth=3)
    
    # Fill area under acceptance curve
    ax.fill_between(price_range, 0, acceptance, alpha=0.2, color='green')
    
    # Mark maximum acceptance point
    ax.scatter([max_price], [max_acceptance], s=200, c='darkgreen', marker='*', 
               zorder=5, edgecolors='black', linewidth=1.5)
    ax.annotate(f'Maximum Acceptance\n${max_price:.2f} ({max_acceptance:.1f}%)', 
                (max_price, max_acceptance),
                xytext=(max_price + (price_range.max() - price_range.min()) * 0.05, max_acceptance - 10),
                fontsize=10, fontweight='bold',
                bbox=dict(boxstyle='round,pad=0.5', facecolor='lightgreen', alpha=0.9),
                arrowprops=dict(arrowstyle='->', color='darkgreen', lw=1.5))
    
    # Formatting
    ax.set_xlabel('Price ($)', fontsize=12)
    ax.set_ylabel('Percentage of Respondents (%)', fontsize=12)
    ax.set_title('Price Acceptance Curve', fontsize=14, fontweight='bold')
    ax.legend(loc='best', fontsize=10)
    ax.grid(True, alpha=0.3, linestyle='-', linewidth=0.5)
    ax.set_ylim(0, 100)
    ax.set_xlim(price_range.min(), price_range.max())
    
    plt.tight_layout()
    
    # Convert to base64
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=100, bbox_inches='tight')
    buf.seek(0)
    img_base64 = base64.b64encode(buf.read()).decode('utf-8')
    buf.close()
    plt.close(fig)
    
    return img_base64

def generate_interpretation(results):
    """Generate strategic pricing interpretation"""
    pmc = results.get('pmc')
    pme = results.get('pme')
    opp = results.get('opp')
    idp = results.get('idp')

    if any(val is None for val in [pmc, pme, opp, idp]):
        return "Could not determine all price points. Check data quality and distribution."

    interpretation = (
        f"The analysis identifies a recommended price range between **${pmc:.2f}** (Point of Marginal Cheapness) "
        f"and **${pme:.2f}** (Point of Marginal Expensiveness).\n\n"
        f"- **Optimal Price Point (OPP): ${opp:.2f}**\n"
        f"  This minimizes the number of customers who find the product too cheap or too expensive.\n\n"
        f"- **Indifference Price Point (IDP): ${idp:.2f}**\n"
        f"  At this price, equal numbers consider the product 'cheap' vs 'expensive'.\n\n"
        f"**Strategic Recommendations:**\n"
        f"- **Premium positioning**: Price between ${idp:.2f} and ${pme:.2f}\n"
        f"- **Value positioning**: Price between ${pmc:.2f} and ${idp:.2f}\n"
        f"- **Avoid**: Pricing below ${pmc:.2f} (quality concerns) or above ${pme:.2f} (price resistance)"
    )
    return interpretation.strip()

def main():
    try:
        # Read input data
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
        price_cols = [too_cheap_col, cheap_col, expensive_col, too_expensive_col]
        
        # Validate columns
        for col in price_cols:
            if col not in df.columns:
                raise ValueError(f"Required column '{col}' not found in data.")
        
        # Clean data
        for col in price_cols:
            df[col] = pd.to_numeric(df[col], errors='coerce')
        
        df_clean = df[price_cols].dropna()
        
        if len(df_clean) < 10:
            raise ValueError(f"Need at least 10 complete responses, found {len(df_clean)}.")
        
        # Validate price ordering
        for idx in df_clean.index:
            prices = df_clean.loc[idx, price_cols].values
            if not all(prices[i] <= prices[i+1] for i in range(len(prices)-1)):
                df_clean.loc[idx, price_cols] = sorted(prices)
        
        # Use VWPSM package if available, otherwise use custom implementation
        if HAS_VWPSM:
            # Use package
            vw_output = VWPSM.results(df_clean, price_cols)
            
            # Capture any plots generated by package
            import matplotlib.pyplot as plt
            figs = [plt.figure(i) for i in plt.get_fignums()]
            plots = {}
            
            if figs:
                buf = io.BytesIO()
                figs[0].savefig(buf, format='png', dpi=100, bbox_inches='tight')
                buf.seek(0)
                plots['psm_plot'] = base64.b64encode(buf.read()).decode('utf-8')
                buf.close()
                plt.close('all')
            
            # Extract results (package may return different formats)
            if isinstance(vw_output, dict):
                results = {
                    'pmc': _to_native_type(vw_output.get('PMC', vw_output.get('pmc'))),
                    'pme': _to_native_type(vw_output.get('PME', vw_output.get('pme'))),
                    'opp': _to_native_type(vw_output.get('OPP', vw_output.get('opp'))),
                    'idp': _to_native_type(vw_output.get('IDP', vw_output.get('idp')))
                }
            else:
                # Fallback to custom implementation if package output is unclear
                HAS_VWPSM = False
        
        if not HAS_VWPSM:
            # Custom implementation
            price_min = df_clean[price_cols].min().min()
            price_max = df_clean[price_cols].max().max()
            price_range = np.linspace(price_min, price_max, 500)
            
            # Calculate curves
            curves = calculate_vw_curves(df_clean, price_cols, price_range)
            
            # Calculate price points
            results = calculate_price_points(price_range, curves)
            
            # Create plots
            plots = {
                'psm_plot': create_psm_plot(price_range, curves, results),
                'acceptance_plot': create_acceptance_plot(price_range, curves)
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
                },
                'method': 'VWPSM Package' if HAS_VWPSM else 'Custom Implementation'
            }
        }
        
        print(json.dumps(response, default=_to_native_type))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
    