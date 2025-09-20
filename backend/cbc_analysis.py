

import sys
import json
import pandas as pd
import numpy as np
import statsmodels.api as sm
import matplotlib.pyplot as plt
import base64
import io

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
    
    import seaborn as sns
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

        # --- Data Cleaning and Preparation ---
        y = pd.to_numeric(df[target_variable], errors='coerce')

        X_parts = []
        feature_names_map = {}
        
        independent_vars = [attr for attr, props in attributes_def.items() if props.get('includeInAnalysis', True) and attr != target_variable]

        for attr_name in independent_vars:
            props = attributes_def[attr_name]
            if props['type'] == 'categorical':
                dummies = pd.get_dummies(df[attr_name], prefix=attr_name, drop_first=True, dtype=float)
                X_parts.append(dummies)
                feature_names_map.update({col: col for col in dummies.columns})
            elif props['type'] == 'numerical':
                numeric_series = pd.to_numeric(df[attr_name], errors='coerce').to_frame()
                X_parts.append(numeric_series)
                feature_names_map.update({attr_name: attr_name})
        
        X = pd.concat(X_parts, axis=1)
        
        full_df = pd.concat([y, X], axis=1).dropna()
        y_clean = full_df[target_variable]
        X_clean = full_df.drop(columns=[target_variable])
        
        if y_clean.empty or X_clean.empty:
            raise ValueError("Not enough valid data after cleaning. Check for non-numeric values.")

        X_with_const = sm.add_constant(X_clean)

        # Fit the OLS model
        model = sm.OLS(y_clean, X_with_const).fit()
        
        # --- Regression Results ---
        regression_results = {
            'rSquared': model.rsquared,
            'adjustedRSquared': model.rsquared_adj,
            'rmse': np.sqrt(model.mse_resid),
            'mae': np.mean(np.abs(model.resid)),
            'predictions': model.predict().tolist(),
            'residuals': model.resid.tolist(),
            'intercept': model.params.get('const', 0.0),
            'coefficients': model.params.drop('const').to_dict()
        }

        # --- Part-Worths and Importance ---
        part_worths = []
        attribute_ranges = {}
        
        for attr_name in independent_vars:
            props = attributes_def[attr_name]
            if props['type'] == 'categorical':
                base_level = props['levels'][0]
                part_worths.append({'attribute': attr_name, 'level': str(base_level), 'value': 0})
                
                level_worths = [0]
                for level in props['levels'][1:]:
                    param_name = f"{attr_name}_{level}"
                    worth = regression_results['coefficients'].get(param_name, 0)
                    part_worths.append({'attribute': attr_name, 'level': str(level), 'value': worth})
                    level_worths.append(worth)
                
                attribute_ranges[attr_name] = max(level_worths) - min(level_worths)
            
            elif props['type'] == 'numerical':
                coeff = regression_results['coefficients'].get(attr_name, 0)
                part_worths.append({'attribute': attr_name, 'level': 'coefficient', 'value': coeff})
                
                val_range = X_clean[attr_name].max() - X_clean[attr_name].min()
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
            'part_worths': part_worths,
            'importance': importance,
            'targetVariable': target_variable
        }
        
        # Wrap final results in a 'results' key to match frontend expectation
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
  

