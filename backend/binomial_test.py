
import sys
import json
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from scipy import stats
import io
import base64
import math

def _to_native_type(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, (np.floating, float)):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, np.bool_):
        return bool(obj)
    return obj

def main():
    try:
        payload = json.load(sys.stdin)
        successes = int(payload.get('successes'))
        trials = int(payload.get('trials'))
        p = float(payload.get('p', 0.5))
        alternative = payload.get('alternative', 'two-sided')

        if successes > trials:
            raise ValueError("Number of successes cannot be greater than the number of trials.")

        result = stats.binomtest(k=successes, n=trials, p=p, alternative=alternative)
        
        # Interpretation
        is_significant = result.pvalue < 0.05
        observed_prop = successes / trials
        
        interpretation = (
            f"A binomial test was conducted to determine whether the observed proportion of successes ({observed_prop:.3f}) was different from the expected proportion of {p:.3f}.\n"
            f"The result was {'statistically significant' if is_significant else 'not statistically significant'}, indicating that the observed proportion is {'different from' if is_significant else 'not different from'} the expected proportion (p = {result.pvalue:.4f})."
        )

        # Plotting
        x = np.arange(0, trials + 1)
        pmf = stats.binom.pmf(x, trials, p)
        
        fig, ax = plt.subplots(figsize=(8, 5))
        ax.bar(x, pmf, alpha=0.7, label=f'Binomial PMF (n={trials}, p={p})')
        ax.axvline(successes, color='red', linestyle='--', label=f'Observed Successes ({successes})')
        ax.set_title('Binomial Distribution and Observed Outcome')
        ax.set_xlabel('Number of Successes')
        ax.set_ylabel('Probability')
        ax.legend()
        ax.grid(True, linestyle='--', alpha=0.5)

        buf = io.BytesIO()
        plt.savefig(buf, format='png')
        plt.close(fig)
        buf.seek(0)
        plot_image = base64.b64encode(buf.read()).decode('utf-8')

        response = {
            'results': {
                'statistic': result.statistic,
                'p_value': result.pvalue,
                'observed_proportion': observed_prop,
                'expected_proportion': p,
                'is_significant': is_significant,
                'interpretation': interpretation
            },
            'plot': f"data:image/png;base64,{plot_image}"
        }

        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
