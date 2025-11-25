import sys
import json
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from scipy import stats
import io
import base64
import warnings

warnings.filterwarnings('ignore')

# Set seaborn style globally (consistent with other analyses)
sns.set_theme(style="darkgrid")
sns.set_context("notebook", font_scale=1.1)

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

def calculate_process_capability(data, usl, lsl):
    """Calculate Cp, Cpk, Pp, Ppk and performance metrics."""
    if usl is None or lsl is None:
        return {}
        
    mean = np.mean(data)
    std_dev = np.std(data, ddof=1)
    
    if std_dev == 0: return {}
    
    # Basic capability indices
    cp = (usl - lsl) / (6 * std_dev)
    cpu = (usl - mean) / (3 * std_dev)
    cpl = (mean - lsl) / (3 * std_dev)
    cpk = min(cpu, cpl)
    
    # For this simplified analysis, Pp and Ppk are assumed to be the same as Cp and Cpk
    # A more rigorous analysis would use long-term vs short-term standard deviation.
    pp = cp
    ppu = cpu
    ppl = cpl
    ppk = cpk
    
    # Calculate Z-scores
    z_upper = (usl - mean) / std_dev
    z_lower = (mean - lsl) / std_dev
    z_min = min(z_upper, z_lower)
    
    # Calculate Sigma Level (based on Cpk)
    # Sigma level = Cpk * 3 (since Cpk = (spec limit - mean) / (3 * sigma))
    sigma_level = cpk * 3
    
    # Calculate PPM (Parts Per Million defects)
    # Using Z-scores to calculate probability of defects
    ppm_upper = (1 - stats.norm.cdf(z_upper)) * 1_000_000
    ppm_lower = stats.norm.cdf(-z_lower) * 1_000_000
    ppm_total = ppm_upper + ppm_lower
    
    # Calculate Yield (percentage within specification)
    yield_percent = (1 - (ppm_total / 1_000_000)) * 100
    
    # Calculate target and offset
    target = (usl + lsl) / 2
    offset = mean - target
    
    # Calculate centering index (how well centered the process is)
    # 1.0 = perfectly centered, 0.0 = at spec limit
    centering_index = 1 - abs(offset) / ((usl - lsl) / 2)
    
    return {
        'cp': cp, 
        'cpk': cpk, 
        'pp': pp, 
        'ppk': ppk,
        'cpu': cpu,
        'cpl': cpl,
        'usl': usl, 
        'lsl': lsl, 
        'mean': mean, 
        'std_dev': std_dev,
        'target': target,
        'offset': offset,
        'centering_index': centering_index,
        'sigma_level': sigma_level,
        'z_upper': z_upper,
        'z_lower': z_lower,
        'z_min': z_min,
        'ppm_upper': ppm_upper,
        'ppm_lower': ppm_lower,
        'ppm_total': ppm_total,
        'yield_percent': yield_percent
    }

def create_capability_plot(data, results):
    """Generate a histogram with capability limits."""
    fig, ax = plt.subplots(figsize=(10, 6))
    
    # Histogram with consistent color
    sns.histplot(data, kde=True, ax=ax, stat='density', color='#1f77b4', alpha=0.6)
    
    xmin, xmax = ax.get_xlim()
    x = np.linspace(xmin, xmax, 100)
    p = stats.norm.pdf(x, results['mean'], results['std_dev'])
    ax.plot(x, p, color='#1f77b4', linewidth=2.5, label='Normal Fit')
    
    # Vertical lines with consistent colors
    ax.axvline(results['mean'], color='black', linestyle='--', linewidth=2, 
               label=f"Mean: {results['mean']:.2f}")
    ax.axvline(results['usl'], color='#d62728', linestyle='-', linewidth=2, 
               label=f"USL: {results['usl']}")
    ax.axvline(results['lsl'], color='#d62728', linestyle='-', linewidth=2, 
               label=f"LSL: {results['lsl']}")
    
    # Add target line if different from mean
    if 'target' in results:
        ax.axvline(results['target'], color='#2ca02c', linestyle=':', linewidth=2, 
                   label=f"Target: {results['target']:.2f}")
    
    # Add sigma levels
    ax.axvline(results['mean'] + 3*results['std_dev'], color='#ff7f0e', 
               linestyle='--', alpha=0.6, linewidth=1.5, label='+3σ')
    ax.axvline(results['mean'] - 3*results['std_dev'], color='#ff7f0e', 
               linestyle='--', alpha=0.6, linewidth=1.5, label='-3σ')
    
    ax.set_xlabel('Measurement', fontsize=12)
    ax.set_ylabel('Density', fontsize=12)
    ax.legend()
    ax.grid(True)
    
    plt.tight_layout()
    
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=100, bbox_inches='tight')
    plt.close(fig)
    buf.seek(0)
    return base64.b64encode(buf.read()).decode('utf-8')


def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        measurement_col = payload.get('measurement_col')
        usl = payload.get('usl')
        lsl = payload.get('lsl')
        
        if not data or not measurement_col:
            raise ValueError("Missing data or measurement column.")
        if usl is None or lsl is None:
            raise ValueError("USL and LSL must be provided.")

        df = pd.DataFrame(data)
        measurements = pd.to_numeric(df[measurement_col], errors='coerce').dropna()
        
        if len(measurements) < 2:
            raise ValueError("Not enough valid data points for analysis.")

        capability_results = calculate_process_capability(measurements, float(usl), float(lsl))
        
        plot_image = create_capability_plot(measurements, capability_results)
        
        response = {
            'results': capability_results,
            'plot': f"data:image/png;base64,{plot_image}"
        }
        
        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()