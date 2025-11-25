import sys
import json
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from scipy.stats import hypergeom, binom
import io
import base64

def _to_native_type(obj):
    if isinstance(obj, np.integer): return int(obj)
    if isinstance(obj, (np.floating, float)): return float(obj) if np.isfinite(obj) else None
    if isinstance(obj, np.ndarray): return obj.tolist()
    return obj

def calculate_acceptance_probability(lot_size, sample_size, acceptance_number, defect_rate):
    """Calculates the probability of accepting a lot."""
    if lot_size > 0:
        # Hypergeometric distribution for finite lots
        num_defects_in_lot = int(lot_size * defect_rate)
        prob = hypergeom.cdf(acceptance_number, lot_size, num_defects_in_lot, sample_size)
    else:
        # Binomial distribution for infinite lots (or when lot size is very large)
        prob = binom.cdf(acceptance_number, sample_size, defect_rate)
    return prob

def generate_oc_curve(lot_size, sample_size, acceptance_number):
    """Generates data for the Operating Characteristic (OC) curve."""
    defect_rates = np.linspace(0, 0.25, 50) # Check defect rates from 0% to 25%
    acceptance_probs = [calculate_acceptance_probability(lot_size, sample_size, acceptance_number, p) for p in defect_rates]
    
    return {
        'defect_rates': defect_rates.tolist(),
        'acceptance_probs': acceptance_probs
    }

def create_oc_curve_plot(oc_data, aql, ltpd):
    # Apply seaborn darkgrid style to match ANOVA
    sns.set_style("darkgrid")
    
    fig, ax = plt.subplots(figsize=(10, 6))
    
    # Main OC curve with thicker line
    ax.plot(oc_data['defect_rates'], oc_data['acceptance_probs'], 
            marker='o', markersize=4, linestyle='-', linewidth=2, color='#2E86AB')
    
    ax.set_title('Operating Characteristic (OC) Curve', fontsize=14, fontweight='bold')
    ax.set_xlabel('Lot Defect Rate (p)', fontsize=11)
    ax.set_ylabel('Probability of Acceptance (Pa)', fontsize=11)
    ax.grid(True, linestyle='--', alpha=0.6)
    ax.set_ylim(0, 1.05)
    ax.set_xlim(0, max(oc_data['defect_rates']))
    
    # Annotate AQL and LTPD
    if aql is not None:
        ax.axvline(x=aql, color='#06A77D', linestyle='--', linewidth=2, 
                   label=f'AQL = {aql*100:.1f}% (Producer\'s Risk α)')
        prob_at_aql = np.interp(aql, oc_data['defect_rates'], oc_data['acceptance_probs'])
        ax.axhline(y=prob_at_aql, color='#06A77D', linestyle=':', linewidth=1.5, 
                   xmax=aql/max(oc_data['defect_rates']))
        ax.text(aql, 0.05, f' α ≈ {(1-prob_at_aql)*100:.1f}%', 
                color='#06A77D', fontsize=10, fontweight='bold')

    if ltpd is not None:
        ax.axvline(x=ltpd, color='#D81E5B', linestyle='--', linewidth=2, 
                   label=f'LTPD = {ltpd*100:.1f}% (Consumer\'s Risk β)')
        prob_at_ltpd = np.interp(ltpd, oc_data['defect_rates'], oc_data['acceptance_probs'])
        ax.axhline(y=prob_at_ltpd, color='#D81E5B', linestyle=':', linewidth=1.5, 
                   xmax=ltpd/max(oc_data['defect_rates']))
        ax.text(ltpd, prob_at_ltpd + 0.05, f' β ≈ {prob_at_ltpd*100:.1f}%', 
                color='#D81E5B', fontsize=10, fontweight='bold')

    ax.legend(loc='best', fontsize=10)
    
    plt.tight_layout()
    
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=100)
    plt.close(fig)
    buf.seek(0)
    return base64.b64encode(buf.read()).decode('utf-8')


def main():
    try:
        payload = json.load(sys.stdin)
        lot_size = int(payload.get('lotSize', 0))
        sample_size = int(payload.get('sampleSize'))
        acceptance_number = int(payload.get('acceptanceNumber'))
        aql = payload.get('aql') # Acceptable Quality Level
        ltpd = payload.get('ltpd') # Lot Tolerance Percent Defective
        
        if sample_size > lot_size and lot_size > 0:
            raise ValueError("Sample size cannot be larger than lot size.")
        if acceptance_number >= sample_size:
            raise ValueError("Acceptance number must be less than sample size.")

        oc_data = generate_oc_curve(lot_size, sample_size, acceptance_number)
        
        plot_image = create_oc_curve_plot(oc_data, aql, ltpd)
        
        # Calculate key risk points
        prob_at_aql = np.interp(aql, oc_data['defect_rates'], oc_data['acceptance_probs']) if aql is not None else None
        prob_at_ltpd = np.interp(ltpd, oc_data['defect_rates'], oc_data['acceptance_probs']) if ltpd is not None else None
        
        results = {
            'oc_curve_data': oc_data,
            'producers_risk_alpha': (1 - prob_at_aql) if prob_at_aql is not None else None,
            'consumers_risk_beta': prob_at_ltpd if prob_at_ltpd is not None else None
        }

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

    