
import sys
import json
import pandas as pd
import statsmodels.formula.api as smf
import statsmodels.api as sm
import re
import numpy as np

def _to_native_type(obj):
    if isinstance(obj, (int, float, str, bool)) or obj is None:
        return obj
    if hasattr(obj, 'item'):
        return obj.item()
    return str(obj)

def _generate_interpretation(model, df_clean, group_var, time_var, outcome_var):
    params = model.params
    pvalues = model.pvalues
    tvalues = model.tvalues
    df_resid = model.df_resid
    
    # --- Find interaction term dynamically ---
    interaction_term_key = None
    for key in params.keys():
        if group_var in key and time_var in key and ':' in key:
            interaction_term_key = key
            break
    
    if interaction_term_key is None:
        return f"Could not determine the DiD effect. Interaction term like '{group_var}:{time_var}' not found in model results."

    did_coefficient = params.get(interaction_term_key)
    did_pvalue = pvalues.get(interaction_term_key)
    did_tvalue = tvalues.get(interaction_term_key)

    if did_coefficient is None or did_pvalue is None:
        return "Could not determine the DiD effect. Required coefficients are missing."

    # --- Calculate Descriptive Statistics ---
    descriptives = df_clean.groupby([group_var, time_var])[outcome_var].agg(['mean', 'std']).unstack(level=time_var)
    
    control_pre_mean, control_pre_std = descriptives.loc[0]['mean'][0], descriptives.loc[0]['std'][0]
    control_post_mean, control_post_std = descriptives.loc[0]['mean'][1], descriptives.loc[0]['std'][1]
    treat_pre_mean, treat_pre_std = descriptives.loc[1]['mean'][0], descriptives.loc[1]['std'][0]
    treat_post_mean, treat_post_std = descriptives.loc[1]['mean'][1], descriptives.loc[1]['std'][1]
    
    # --- Construct Interpretation ---
    sig_text = "statistically significant" if did_pvalue < 0.05 else "not statistically significant"
    p_val_text = f"p < .001" if did_pvalue < 0.001 else f"p = {did_pvalue:.3f}"
    direction_text = "increase" if did_coefficient > 0 else "decrease"

    interpretation = (
        f"A Difference-in-Differences (DiD) analysis was conducted to estimate the causal effect of the intervention ('{group_var}') on the outcome ('{outcome_var}') over time ('{time_var}').\n\n"
        f"Before the intervention (time=0), the treatment group had a mean '{outcome_var}' of {treat_pre_mean:.2f} (SD = {treat_pre_std:.2f}), while the control group had a mean of {control_pre_mean:.2f} (SD = {control_pre_std:.2f}). "
        f"After the intervention (time=1), the treatment group's mean changed to {treat_post_mean:.2f} (SD = {treat_post_std:.2f}), and the control group's mean changed to {control_post_mean:.2f} (SD = {control_post_std:.2f}).\n\n"
        f"The DiD estimator, represented by the interaction term, was found to be {sig_text} (β = {did_coefficient:.4f}, t({int(df_resid)}) = {did_tvalue:.2f}, {p_val_text}).\n\n"
    )
    
    if did_pvalue < 0.05:
        interpretation += (
            f"This result suggests that the intervention had a significant effect. Specifically, after accounting for the change in the control group, the intervention led to a {direction_text} of approximately "
            f"{abs(did_coefficient):.4f} units in the '{outcome_var}' for the treatment group compared to what would have been expected without the intervention."
        )
    else:
        interpretation += (
            "This result suggests that there is not enough statistical evidence to conclude that the intervention had a different effect on the treatment group compared to the control group over and above the change observed in the control group."
        )
        
    return interpretation.strip()

def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        group_var = payload.get('group_var')
        time_var = payload.get('time_var')
        outcome_var = payload.get('outcome_var')
        
        if not all([data, group_var, time_var, outcome_var]):
            raise ValueError("Missing required parameters: data, group_var, time_var, or outcome_var")

        df = pd.DataFrame(data)

        # Convert group/time vars to numeric categories (0/1) for easier interpretation
        df[group_var] = pd.Categorical(df[group_var]).codes
        df[time_var] = pd.Categorical(df[time_var]).codes

        df[outcome_var] = pd.to_numeric(df[outcome_var], errors='coerce')
        df_clean = df.dropna(subset=[outcome_var, group_var, time_var]).copy()
        
        if len(df_clean[group_var].unique()) != 2 or len(df_clean[time_var].unique()) != 2:
             raise ValueError("Group and Time variables must each have exactly two unique values for DiD analysis.")

        # --- Sanitize column names for formula ---
        outcome_clean = re.sub(r'[^A-Za-z0-9_]', '_', outcome_var)
        group_clean = re.sub(r'[^A-Za-z0-9_]', '_', group_var)
        time_clean = re.sub(r'[^A-Za-z0-9_]', '_', time_var)
        
        df_clean_renamed = df_clean.rename(columns={
            outcome_var: outcome_clean,
            group_var: group_clean,
            time_var: time_clean
        })

        formula = f'Q("{outcome_clean}") ~ C(Q("{group_clean}")) * C(Q("{time_clean}"))'
        model = smf.ols(formula, data=df_clean_renamed).fit()
        
        # --- Clean up coefficient names for display ---
        name_map = {
            group_clean: group_var,
            time_clean: time_var,
            outcome_clean: outcome_var
        }

        def clean_name(name):
            name = name.strip()
            # This regex will find C(Q("..."))[T.value] and replace it with the original variable name
            for clean, orig in name_map.items():
                name = re.sub(f'C\\(Q\\("{clean}"\\)\\)\\[T\\.([^]]+)\\]', orig + '_[T.\\1]', name)
            # This will find any remaining Q("...") and replace it
            name = re.sub(r'Q\("([^"]+)"\)', lambda m: name_map.get(m.group(1), m.group(1)), name)
            return name

        params_cleaned = {clean_name(k): v for k, v in model.params.to_dict().items()}
        pvalues_cleaned = {clean_name(k): v for k, v in model.pvalues.to_dict().items()}
        
        # --- Generate Interpretation ---
        interpretation = _generate_interpretation(model, df_clean, group_var, time_var, outcome_var)

        summary_obj = model.summary()
        summary_data = []
        for table in summary_obj.tables:
            table_data = [list(row) for row in table.data]
            if table_data:
                if len(table_data) > 1 and 'coef' in table_data[0]:
                    for row in table_data[1:]:
                        if row and row[0]:
                             row[0] = clean_name(row[0])
            
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
                'rsquared_adj': model.rsquared_adj,
                'interpretation': interpretation
            }
        }
        
        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        error_response = {"error": str(e)}
        sys.stderr.write(json.dumps(error_response))
        sys.exit(1)

if __name__ == '__main__':
    main()

  
