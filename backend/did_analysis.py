
import sys
import json
import pandas as pd
import statsmodels.formula.api as smf
import re

def _to_native_type(obj):
    if isinstance(obj, (int, float, str, bool)) or obj is None:
        return obj
    if hasattr(obj, 'item'):
        return obj.item()
    return str(obj)

def _generate_interpretation(params, pvalues, group_var, time_var, outcome_var):
    interaction_term_key = f'{group_var}:{time_var}'
    
    did_coefficient = params.get(interaction_term_key)
    did_pvalue = pvalues.get(interaction_term_key)

    if did_coefficient is None or did_pvalue is None:
        return "Could not determine the DiD effect. Please check your variable specifications."

    sig_text = "statistically significant" if did_pvalue < 0.05 else "not statistically significant"
    direction_text = "increase" if did_coefficient > 0 else "decrease"
    
    interpretation = (
        f"A Difference-in-Differences (DiD) analysis was conducted to estimate the causal effect of the intervention ('{group_var}') on the outcome ('{outcome_var}') over time ('{time_var}').\n\n"
        f"The DiD estimator, represented by the interaction term '{interaction_term_key}', was found to be {sig_text} (β = {did_coefficient:.4f}, p = {did_pvalue:.4f}).\n\n"
    )
    
    if did_pvalue < 0.05:
        interpretation += (
            f"This result suggests that the intervention had a significant effect. Specifically, the treatment group experienced an average {direction_text} of approximately "
            f"{abs(did_coefficient):.4f} units in the '{outcome_var}' after the intervention, compared to the change experienced by the control group."
        )
    else:
        interpretation += (
            "This result suggests that there is not enough statistical evidence to conclude that the intervention had a different effect on the treatment group compared to the control group."
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

        # Do not convert group/time vars to numeric, let statsmodels handle them as categories
        df[outcome_var] = pd.to_numeric(df[outcome_var], errors='coerce')
        df.dropna(subset=[outcome_var, group_var, time_var], inplace=True)
        
        if len(df[group_var].unique()) != 2 or len(df[time_var].unique()) != 2:
             raise ValueError("Group and Time variables must each have exactly two unique values for DiD analysis.")

        # Sanitize column names for formula
        outcome_clean = outcome_var.replace(' ', '_').replace('.', '_')
        group_clean = group_var.replace(' ', '_').replace('.', '_')
        time_clean = time_var.replace(' ', '_').replace('.', '_')
        
        df_clean = df.rename(columns={
            outcome_var: outcome_clean,
            group_var: group_clean,
            time_var: time_clean
        })

        formula = f'Q("{outcome_clean}") ~ C(Q("{group_clean}")) * C(Q("{time_clean}"))'
        model = smf.ols(formula, data=df_clean).fit()
        
        # --- Clean up coefficient names ---
        def clean_name(name):
            name = name.strip()
            # Handle interaction terms C(Q("..."))[...]:C(Q("..."))[...]
            name = re.sub(f'C\\(Q\\("{group_clean}"\\)\\)\\[T\\.([^]]+)\\]', group_var, name)
            name = re.sub(f'C\\(Q\\("{time_clean}"\\)\\)\\[T\\.([^]]+)\\]', time_var, name)
            # Handle simple quoted names Q("...")
            name = re.sub(r'Q\("([^"]+)"\)', r'\1', name)
            return name

        params_cleaned = {clean_name(k): v for k, v in model.params.to_dict().items()}
        pvalues_cleaned = {clean_name(k): v for k, v in model.pvalues.to_dict().items()}

        summary_obj = model.summary()
        summary_data = []
        for table in summary_obj.tables:
            table_data = [list(row) for row in table.data]
            if table_data:
                # Clean header of the coefficient table
                if len(table_data) > 1 and 'coef' in table_data[0]:
                    for row in table_data[1:]:
                        if row and row[0]:
                             row[0] = clean_name(row[0])
            
            summary_data.append({
                'caption': getattr(table, 'title', None),
                'data': table_data
            })
        
        interpretation = _generate_interpretation(params_cleaned, pvalues_cleaned, group_var, time_var, outcome_var)

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
