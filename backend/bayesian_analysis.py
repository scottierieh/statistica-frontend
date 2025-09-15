
import sys
import json
import pandas as pd
import pingouin as pg
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import io
import base64

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
        group_col = payload.get('group_col')
        value_col = payload.get('value_col')

        if not all([data, group_col, value_col]):
            raise ValueError("Missing 'data', 'group_col', or 'value_col'")

        df = pd.DataFrame(data)
        
        groups = df[group_col].unique()
        if len(groups) != 2:
            raise ValueError(f"Grouping variable must have exactly 2 groups, but found {len(groups)}")

        group1_data = df[df[group_col] == groups[0]][value_col].dropna()
        group2_data = df[df[group_col] == groups[1]][value_col].dropna()

        # Perform Bayesian T-Test
        bayes_test = pg.bayesfactor_ttest(group1_data, group2_data)

        # Posterior distribution of the difference in means
        post = pg.ttest(group1_data, group2_data, correction=False)
        post_dist = post.iloc[0]['posterior']
        
        # Summary statistics for each group
        desc_stats = {
            str(groups[0]): {'mean': group1_data.mean(), 'std': group1_data.std(), 'n': len(group1_data)},
            str(groups[1]): {'mean': group2_data.mean(), 'std': group2_data.std(), 'n': len(group2_data)}
        }
        
        # Create plots
        fig, axes = plt.subplots(1, 2, figsize=(12, 5))
        
        # Posterior Distribution Plot
        sns.kdeplot(post_dist, fill=True, ax=axes[0])
        hdi_95 = np.percentile(post_dist, [2.5, 97.5])
        axes[0].axvline(0, color='grey', linestyle='--')
        axes[0].axvline(post_dist.mean(), color='red', linestyle='-', label=f'Mean Diff: {post_dist.mean():.2f}')
        axes[0].axvspan(hdi_95[0], hdi_95[1], color='skyblue', alpha=0.3, label='95% HDI')
        axes[0].set_title('Posterior Distribution of Mean Difference')
        axes[0].set_xlabel(f'Mean({groups[0]}) - Mean({groups[1]})')
        axes[0].legend()
        
        # Group Distributions
        sns.kdeplot(group1_data, ax=axes[1], fill=True, label=str(groups[0]))
        sns.kdeplot(group2_data, ax=axes[1], fill=True, label=str(groups[1]))
        axes[1].set_title('Group Distributions')
        axes[1].set_xlabel(value_col)
        axes[1].legend()
        
        plt.tight_layout()
        buf = io.BytesIO()
        plt.savefig(buf, format='png')
        buf.seek(0)
        plot_image = base64.b64encode(buf.read()).decode('utf-8')
        plt.close(fig)

        # Prepare response
        response = {
            'results': {
                'bf10': bayes_test['BF10'].iloc[0],
                'hdi_95': hdi_95.tolist(),
                'prob_g1_gt_g2': (post_dist > 0).mean(),
                'prob_g2_gt_g1': (post_dist < 0).mean(),
                'mean_difference': post_dist.mean(),
                'rope_percentage': ((post_dist > -0.1) & (post_dist < 0.1)).mean(),
                'descriptives': desc_stats,
                'groups': [str(g) for g in groups]
            },
            'plot': f"data:image/png;base64,{plot_image}"
        }

        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
