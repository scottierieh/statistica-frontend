

import sys
import json
import pandas as pd
import numpy as np
import statsmodels.api as sm
from statsmodels.formula.api import ols
import matplotlib.pyplot as plt
import seaborn as sns
import io
import base64

def _to_native_type(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, (float, np.floating)):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    return obj

def generate_sensitivity_plot(sensitivity_results):
    if not sensitivity_results:
        return None
    
    levels = [item['level'] for item in sensitivity_results]
    utilities = [item['utility'] for item in sensitivity_results]
    
    fig, ax = plt.subplots(figsize=(8, 5))
    sns.barplot(x=levels, y=utilities, ax=ax, palette='viridis')
    ax.set_title(f"Sensitivity Analysis for {sensitivity_results[0].get('attribute', 'Attribute')}")
    ax.set_xlabel('Level')
    ax.set_ylabel('Calculated Utility')
    ax.grid(True, axis='y', linestyle='--', alpha=0.6)
    
    plt.tight_layout()
    buf = io.BytesIO()
    plt.savefig(buf, format='png')
    plt.close(fig)
    buf.seek(0)
    return base64.b64encode(buf.read()).decode('utf-8')

def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        attributes_def = payload.get('attributes')
        target_variable = payload.get('targetVariable')
        sensitivity_analysis_request = payload.get('sensitivityAnalysis')

        if not all([data, attributes_def, target_variable]):
            raise ValueError("Missing 'data', 'attributes', or 'targetVariable'")

        df = pd.DataFrame(data)

        # Sanitize column names for the formula
        sanitized_cols = {col: f'{col.replace(" ", "_").replace(".", "_")}' for col in df.columns}
        df.rename(columns=sanitized_cols, inplace=True)
        
        target_var_clean = sanitized_cols[target_variable]
        
        formula_parts = []
        all_analysis_vars_set = {target_var_clean}

        for attr_name, props in attributes_def.items():
            attr_name_clean = sanitized_cols.get(attr_name, attr_name)
            if props.get('includeInAnalysis', True) and attr_name_clean != target_var_clean:
                all_analysis_vars_set.add(attr_name_clean)
                if props['type'] == 'categorical':
                    formula_parts.append(f'C(Q("{attr_name_clean}"))')
                else: # numerical - treat as is
                    formula_parts.append(f'Q("{attr_name_clean}")')
        
        all_analysis_vars = list(all_analysis_vars_set)
        
        # --- Data Cleaning and Type Conversion ---
        df_clean = df[all_analysis_vars].copy()
        
        for col in df.columns:
            if col in all_analysis_vars:
                # This will coerce any non-numeric strings to NaN, which are then dropped.
                df_clean[col] = pd.to_numeric(df_clean[col], errors='coerce')
        
        df_clean.dropna(subset=all_analysis_vars, inplace=True)
        
        if df_clean.empty:
            raise ValueError("No valid data left after cleaning. Please check for missing values or non-numeric entries in your target and feature columns.")

        formula = f'Q("{target_var_clean}") ~ {" + ".join(formula_parts)}'
        
        # Fit the OLS model to get coefficients and other stats
        model = ols(formula, data=df_clean).fit()
        
        # --- Regression Results ---
        regression_results = {
            'rSquared': model.rsquared,
            'adjustedRSquared': model.rsquared_adj,
            'rmse': np.sqrt(model.mse_resid),
            'mae': np.mean(np.abs(model.resid)),
            'predictions': model.predict().tolist(),
            'residuals': model.resid.tolist(),
            'intercept': model.params.get('Intercept', 0.0),
            'coefficients': model.params.to_dict()
        }

        # --- Part-Worths and Importance ---
        part_worths = []
        attribute_ranges = {}
        
        independent_vars = [attr for attr, props in attributes_def.items() if props.get('includeInAnalysis', True) and attr != target_variable]

        for attr_name in independent_vars:
            props = attributes_def[attr_name]
            attr_name_clean = sanitized_cols[attr_name]

            if props['type'] == 'categorical':
                base_level = props['levels'][0]
                part_worths.append({'attribute': attr_name, 'level': str(base_level), 'value': 0})
                
                level_worths = [0]
                for level in props['levels'][1:]:
                    param_name = f"C(Q(\"{attr_name_clean}\"))[T.{level}]"
                    worth = model.params.get(param_name, 0)
                    part_worths.append({'attribute': attr_name, 'level': str(level), 'value': worth})
                    level_worths.append(worth)
                
                attribute_ranges[attr_name] = max(level_worths) - min(level_worths)
            
            elif props['type'] == 'numerical':
                clean_name = f'Q("{attr_name_clean}")'
                coeff = model.params.get(clean_name, 0)
                part_worths.append({'attribute': attr_name, 'level': 'coefficient', 'value': coeff})
                
                val_range = df_clean[attr_name_clean].max() - df_clean[attr_name_clean].min()
                attribute_ranges[attr_name] = abs(coeff * val_range)

        total_range = sum(attribute_ranges.values())
        importance = []
        if total_range > 0:
            for attr_name, range_val in attribute_ranges.items():
                importance.append({
                    'attribute': attr_name,
                    'importance': (range_val / total_range) * 100
                })
        importance.sort(key=lambda x: x['importance'], reverse=True)

        final_results = {
            'regression': regression_results,
            'partWorths': part_worths,
            'importance': importance,
            'targetVariable': target_variable
        }
        
        # --- Create a new response structure that includes results ---
        response = {'results': final_results}
        
        if sensitivity_analysis_request:
            sensitivity_plot_img = generate_sensitivity_plot(sensitivity_analysis_request)
            response['sensitivity_plot'] = f"data:image/png;base64,{sensitivity_plot_img}" if sensitivity_plot_img else None

        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
  

