
import sys
import json
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from lifelines import KaplanMeierFitter, CoxPHFitter
from lifelines.statistics import logrank_test, multivariate_logrank_test
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
    elif isinstance(obj, np.bool_):
        return bool(obj)
    return obj

def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        duration_col = payload.get('durationCol')
        event_col = payload.get('eventCol')
        group_col = payload.get('groupCol')
        covariates = payload.get('covariates', [])

        if not all([data, duration_col, event_col]):
            raise ValueError("Missing 'data', 'durationCol', or 'eventCol'")

        df = pd.DataFrame(data)

        results = {}
        plots = {}

        # --- 1. Kaplan-Meier Analysis ---
        kmf = KaplanMeierFitter()
        fig, axes = plt.subplots(2, 2, figsize=(14, 10))
        fig.suptitle('Survival Analysis Overview', fontsize=16, fontweight='bold')
        
        # Overall Survival Curve
        kmf.fit(df[duration_col], event_observed=df[event_col], label='Overall Survival')
        kmf.plot_survival_function(ax=axes[0, 0], ci_show=True)
        axes[0, 0].set_title('Kaplan-Meier Survival Curve')
        axes[0, 0].grid(True, alpha=0.3)
        
        # Cumulative Hazard Curve
        kmf.plot_cumulative_hazard(ax=axes[0, 1], ci_show=True)
        axes[0, 1].set_title('Cumulative Hazard Function')
        axes[0, 1].grid(True, alpha=0.3)

        results['kaplan_meier'] = {
            'survival_table': kmf.survival_function_.reset_index().rename(columns={'timeline': 'Time'}).to_dict('records'),
            'median_survival_time': kmf.median_survival_time_,
            'confidence_interval': kmf.confidence_interval_survival_function_.reset_index().to_dict('records'),
        }

        # --- 2. Grouped Analysis & Log-rank Test ---
        if group_col:
            groups = df[group_col].unique()
            group_results = {}
            for group in groups:
                group_df = df[df[group_col] == group]
                kmf_group = KaplanMeierFitter()
                kmf_group.fit(group_df[duration_col], event_observed=group_df[event_col], label=str(group))
                kmf_group.plot_survival_function(ax=axes[1, 0])
                group_results[str(group)] = {'median_survival': kmf_group.median_survival_time_}

            axes[1, 0].set_title(f'Survival Curves by {group_col}')
            axes[1, 0].legend()
            axes[1, 0].grid(True, alpha=0.3)
            results['kaplan_meier_grouped'] = group_results

            if len(groups) > 1:
                lr_results = multivariate_logrank_test(df[duration_col], df[group_col], df[event_col])
                results['log_rank_test'] = {
                    'test_statistic': lr_results.test_statistic,
                    'p_value': lr_results.p_value,
                    'is_significant': lr_results.p_value < 0.05
                }
        else:
            axes[1, 0].text(0.5, 0.5, 'No group variable selected', ha='center', va='center', fontsize=12, color='gray')
            axes[1, 0].set_title('Grouped Survival Curves')


        # --- 3. Cox Proportional Hazards Model & Risk Groups ---
        numeric_covariates = [c for c in covariates if c in df.select_dtypes(include=np.number).columns and c not in [duration_col, event_col, group_col]]
        if numeric_covariates:
            cox_data = df[[duration_col, event_col] + numeric_covariates].dropna()
            cph = CoxPHFitter()
            cph.fit(cox_data, duration_col=duration_col, event_col=event_col)
            results['cox_ph'] = cph.summary.reset_index().to_dict('records')
            
            # Risk groups plot
            risk_scores = cph.predict_partial_hazard(cox_data)
            risk_groups = pd.qcut(risk_scores, q=[0, .33, .66, 1], labels=['Low Risk', 'Medium Risk', 'High Risk'])
            cox_data['risk_group'] = risk_groups
            
            for group in ['Low Risk', 'Medium Risk', 'High Risk']:
                group_df = cox_data[cox_data['risk_group'] == group]
                if not group_df.empty:
                    kmf.fit(group_df[duration_col], group_df[event_col], label=group)
                    kmf.plot_survival_function(ax=axes[1, 1])

            axes[1, 1].set_title('Survival by Risk Group (Cox Model)')
            axes[1, 1].legend()
            axes[1, 1].grid(True, alpha=0.3)
        else:
             axes[1, 1].text(0.5, 0.5, 'No covariates for Cox model', ha='center', va='center', fontsize=12, color='gray')
             axes[1, 1].set_title('Survival by Risk Group')

        plt.tight_layout(rect=[0, 0.03, 1, 0.95])
        
        buf = io.BytesIO()
        plt.savefig(buf, format='png')
        plt.close()
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
