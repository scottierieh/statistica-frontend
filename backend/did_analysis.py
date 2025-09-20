
import sys
import json
import pandas as pd
import statsmodels.formula.api as smf

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
        group_var = payload.get('group_var')
        time_var = payload.get('time_var')
        outcome_var = payload.get('outcome_var')
        
        if not all([data, group_var, time_var, outcome_var]):
            raise ValueError("Missing required parameters: data, group_var, time_var, or outcome_var")

        df = pd.DataFrame(data)

        # Ensure correct data types
        df[outcome_var] = pd.to_numeric(df[outcome_var], errors='coerce')
        # Do not convert group and time vars to numeric, let statsmodels handle them as categorical
        
        df.dropna(subset=[outcome_var, group_var, time_var], inplace=True)

        # Sanitize column names for formula
        outcome_clean = outcome_var.replace(' ', '_').replace('.', '_')
        group_clean = group_var.replace(' ', '_').replace('.', '_')
        time_clean = time_var.replace(' ', '_').replace('.', '_')
        
        df.rename(columns={
            outcome_var: outcome_clean,
            group_var: group_clean,
            time_var: time_clean
        }, inplace=True)

        # Run OLS regression - statsmodels will auto-dummy code the categorical vars
        formula = f'Q("{outcome_clean}") ~ C(Q("{group_clean}")) * C(Q("{time_clean}"))'
        model = smf.ols(formula, data=df).fit()
        
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
                'params': model.params.to_dict(),
                'pvalues': model.pvalues.to_dict(),
                'rsquared': model.rsquared,
                'rsquared_adj': model.rsquared_adj
            }
        }
        
        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        error_response = {"error": str(e)}
        sys.stderr.write(json.dumps(error_response))
        sys.exit(1)

if __name__ == '__main__':
    main()
