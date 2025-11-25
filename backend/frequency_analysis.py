
import sys
import json
import pandas as pd
import numpy as np
import io
import base64
import matplotlib.pyplot as plt
import seaborn as sns
from scipy.stats import entropy

# Set seaborn style globally
sns.set_theme(style="darkgrid")
sns.set_context("notebook", font_scale=1.1)

def _to_native_type(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        if np.isnan(obj):
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
        data = payload.get('data')
        variables = payload.get('variables')

        if not data or not variables:
            raise ValueError("Missing 'data' or 'variables'")

        df = pd.DataFrame(data)
        results = {}

        for var in variables:
            if var not in df.columns:
                results[var] = {"error": f"Variable '{var}' not found in data."}
                continue

            series = df[var].dropna()
            
            if series.empty:
                results[var] = {"error": f"No valid data for variable '{var}'."}
                continue

            freq_table = series.value_counts().reset_index()
            freq_table.columns = ['Value', 'Frequency']
            total_count = freq_table['Frequency'].sum()
            
            freq_table['Percentage'] = (freq_table['Frequency'] / total_count) * 100
            freq_table['Cumulative Percentage'] = freq_table['Percentage'].cumsum()

            # --- Advanced Insights Calculation ---
            insights = []
            recommendations = []
            
            # 1. Skewness / Concentration
            top_category = freq_table.iloc[0]
            concentration = top_category['Percentage']
            if concentration > 60:
                insights.append({
                    "type": "warning",
                    "title": "Highly Skewed Distribution",
                    "description": f"One category ('{top_category['Value']}') dominates with {top_category['Frequency']} observations ({concentration:.1f}% of total), indicating strong concentration."
                })
                recommendations.extend([
                    "Consider stratified sampling to balance categories if building predictive models.",
                    "Use weighted analysis methods to account for imbalance.",
                    "Investigate reasons for the high concentration in the dominant category."
                ])

            # 2. Diversity / Entropy
            counts = freq_table['Frequency'].values
            probabilities = counts / total_count
            shannon_entropy = entropy(probabilities, base=2)
            max_entropy = np.log2(len(counts)) if len(counts) > 1 else 0
            
            if max_entropy > 0 and (shannon_entropy / max_entropy) < 0.5:
                insights.append({
                    "type": "info",
                    "title": "Low Diversity",
                    "description": f"Low entropy ({shannon_entropy:.2f}/{max_entropy:.2f}) indicates concentration in fewer categories."
                })

            # --- Plotting ---
            fig, ax = plt.subplots(figsize=(10, 6))
            plot_data = freq_table.head(20)
            
            # Use seaborn barplot with custom color
            sns.barplot(x='Frequency', y='Value', data=plot_data, ax=ax, palette='crest', orient='h')
            
            ax.set_xlabel('Frequency', fontsize=12)
            ax.set_ylabel(var, fontsize=12)
            
            plt.tight_layout()
            
            buf = io.BytesIO()
            plt.savefig(buf, format='png', dpi=100, bbox_inches='tight')
            plt.close(fig)
            buf.seek(0)
            plot_image = base64.b64encode(buf.read()).decode('utf-8')

            results[var] = {
                'table': freq_table.to_dict('records'),
                'summary': {
                    'total_count': int(total_count),
                    'unique_categories': len(freq_table),
                    'mode': top_category['Value'] if not freq_table.empty else None,
                    'entropy': shannon_entropy,
                    'max_entropy': max_entropy,
                },
                'insights': insights,
                'recommendations': recommendations,
                'plot': f"data:image/png;base64,{plot_image}"
            }

        print(json.dumps({'results': results}, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
    
