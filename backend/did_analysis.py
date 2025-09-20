

import sys
import json
import pandas as pd
import statsmodels.formula.api as smf
import statsmodels.api as sm
import re
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import io
import base64

def _to_native_type(obj):
    if isinstance(obj, (int, float, str, bool)) or obj is None:
        return obj
    if hasattr(obj, 'item'):
        return obj.item()
    return str(obj)

def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        group_var_orig = payload.get('group_var')
        time_var_orig = payload.get('time_var')
        outcome_var_orig = payload.get('outcome_var')
        
        if not all([data, group_var_orig, time_var_orig, outcome_var_orig]):
            raise ValueError("Missing required parameters: data, group_var, time_var, or outcome_var")

        df = pd.DataFrame(data)

        # Convert group/time vars to numeric categories (0/1) for easier interpretation
        # Store original labels for plotting
        group_labels = df[group_var_orig].unique()
        time_labels = df[time_var_orig].unique()
        
        df[group_var_orig] = pd.Categorical(df[group_var_orig])
        df[time_var_orig] = pd.Categorical(df[time_var_orig])

        group_map = {code: label for code, label in enumerate(df[group_var_orig].cat.categories)}
        time_map = {code: label for code, label in enumerate(df[time_var_orig].cat.categories)}

        df['group_encoded'] = df[group_var_orig].cat.codes
        df['time_encoded'] = df[time_var_orig].cat.codes
        
        group_var = 'group_encoded'
        time_var = 'time_encoded'
        outcome_var = outcome_var_orig


        df[outcome_var] = pd.to_numeric(df[outcome_var], errors='coerce')
        df_clean = df.dropna(subset=[outcome_var, group_var, time_var]).copy()
        
        if len(df_clean[group_var].unique()) != 2 or len(df_clean[time_var].unique()) != 2:
             raise ValueError("Group and Time variables must each have exactly two unique values for DiD analysis.")

        # Use Q() to handle special characters in column names for the formula
        formula = f'Q("{outcome_var}") ~ C(Q("{group_var}")) * C(Q("{time_var}"))'
        model = smf.ols(formula, data=df_clean).fit()
        
        # --- Plotting ---
        fig, ax = plt.subplots(figsize=(8, 6))
        sns.pointplot(data=df_clean, x=time_var, y=outcome_var, hue=group_var, ax=ax, dodge=True, errorbar='ci', capsize=.1)
        
        ax.set_title(f'Difference-in-Differences Plot')
        ax.set_xlabel('Time')
        ax.set_ylabel(f'Mean of {outcome_var_orig}')
        
        # Customize ticks and legend
        ax.set_xticks([0, 1])
        ax.set_xticklabels([time_map.get(0, 'Pre'), time_map.get(1, 'Post')])
        handles, labels = ax.get_legend_handles_labels()
        ax.legend(handles, [group_map.get(int(l), l) for l in labels], title=group_var_orig)

        plt.grid(True, linestyle='--', alpha=0.6)
        plt.tight_layout()
        
        buf = io.BytesIO()
        plt.savefig(buf, format='png')
        plt.close(fig)
        buf.seek(0)
        plot_image = base64.b64encode(buf.read()).decode('utf-8')


        # --- Clean up coefficient names for display ---
        params_cleaned = {str(k): v for k, v in model.params.to_dict().items()}
        pvalues_cleaned = {str(k): v for k, v in model.pvalues.to_dict().items()}
        
        summary_obj = model.summary()
        summary_data = []
        for table in summary_obj.tables:
            table_data = [list(row) for row in table.data]
            
            summary_data.append({
                'caption': getattr(table, 'title', None),
                'data': table_data
            })
        
        response = {
            'results': {
                'model_summary_data': summary_data,
                'params': params_cleaned,
                'pvalues': pvalues_cleaned,
                'rsquared': model.rsquared,
                'rsquared_adj': model.rsquared_adj
            },
            'plot': f"data:image/png;base64,{plot_image}"
        }
        
        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        error_response = {"error": str(e)}
        sys.stderr.write(json.dumps(error_response))
        sys.exit(1)

if __name__ == '__main__':
    main()

  




