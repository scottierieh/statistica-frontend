
import sys
import json
import pandas as pd
import numpy as np
import io
import base64
import matplotlib.pyplot as plt
import seaborn as sns

def _to_native_type(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        if np.isnan(obj):
            return None
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    return obj

def get_interpretation(sorted_scores):
    if not sorted_scores:
        return "No data available for interpretation."

    top_item = sorted_scores[0]['item']
    bottom_item = sorted_scores[-1]['item']
    
    interpretation = (
        f"The MaxDiff analysis reveals a clear preference hierarchy among the evaluated items.\n\n"
        f"**Top Preference:** '{top_item}' emerges as the most preferred item with the highest net score. This indicates it was chosen as 'Best' far more often than 'Worst', making it a key strength or a highly desired feature.\n\n"
        f"**Bottom Preference:** Conversely, '{bottom_item}' is the least preferred item, with a significantly negative net score. This item was frequently chosen as 'Worst' and should be a primary candidate for review, improvement, or deprioritization.\n\n"
        "The ranking of the items in between provides a roadmap for prioritizing product features, marketing messages, or service improvements."
    )
    return interpretation.strip()

def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        best_col = payload.get('bestCol')
        worst_col = payload.get('worstCol')

        if not all([data, best_col, worst_col]):
            raise ValueError("Missing required parameters: data, bestCol, or worstCol")

        df = pd.DataFrame(data)

        # Get all unique items mentioned in best/worst columns
        all_items = pd.unique(df[[best_col, worst_col]].values.ravel('K'))
        
        best_counts = df[best_col].value_counts().reindex(all_items, fill_value=0)
        worst_counts = df[worst_col].value_counts().reindex(all_items, fill_value=0)
        
        n_respondents = len(df)
        
        # Calculate scores
        scores = {}
        for item in all_items:
            best_pct = (best_counts.get(item, 0) / n_respondents) * 100
            worst_pct = (worst_counts.get(item, 0) / n_respondents) * 100
            scores[item] = {
                'best_count': int(best_counts.get(item, 0)),
                'worst_count': int(worst_counts.get(item, 0)),
                'best_pct': best_pct,
                'worst_pct': worst_pct,
                'net_score': best_pct - worst_pct,
            }

        # Sort results by net score
        sorted_scores = sorted(scores.items(), key=lambda x: x[1]['net_score'], reverse=True)
        
        results_list = [{'item': item, **metrics} for item, metrics in sorted_scores]
        
        interpretation = get_interpretation(results_list)

        # --- Plotting ---
        results_df = pd.DataFrame(results_list)
        colors = ['green' if score >= 0 else 'red' for score in results_df['net_score']]
        
        plt.figure(figsize=(10, 6))
        sns.barplot(x='net_score', y='item', data=results_df, palette=colors, orient='h')
        plt.title('MaxDiff Analysis: Net Preference Score')
        plt.xlabel('Net Score (% Best - % Worst)')
        plt.ylabel('Item')
        plt.tight_layout()

        buf = io.BytesIO()
        plt.savefig(buf, format='png')
        plt.close()
        buf.seek(0)
        plot_image = base64.b64encode(buf.read()).decode('utf-8')

        response = {
            'results': {
                'scores': results_list,
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
