
import sys
import json
import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import r2_score, mean_squared_error, mean_absolute_error
import warnings

warnings.filterwarnings('ignore')

def _to_native_type(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, (float, np.floating)):
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
        attributes = payload.get('attributes')
        target_variable = payload.get('targetVariable')
        segment_variable = payload.get('segmentVariable')

        if not all([data, attributes, target_variable]):
            raise ValueError("Missing 'data', 'attributes', or 'targetVariable'")

        df = pd.DataFrame(data)

        def run_conjoint_analysis(sub_df, sub_attributes):
            X_list = []
            feature_names = []
            
            independent_vars = [attr for attr, props in sub_attributes.items() if props.get('includeInAnalysis', True) and attr != target_variable]
            
            all_cols_to_check = independent_vars + [target_variable]
            sub_df_clean = sub_df[all_cols_to_check].copy().dropna()
            
            if sub_df_clean.empty: return None

            for attr_name in independent_vars:
                props = sub_attributes[attr_name]
                if props['type'] == 'categorical':
                    sub_df_clean[attr_name] = sub_df_clean[attr_name].astype(str)
                    dummies = pd.get_dummies(sub_df_clean[attr_name], prefix=attr_name, drop_first=True).astype(int)
                    X_list.append(dummies)
                    feature_names.extend(dummies.columns.tolist())
                elif props['type'] == 'numerical':
                    scaler = StandardScaler()
                    scaled_feature = scaler.fit_transform(sub_df_clean[[attr_name]])
                    X_list.append(pd.DataFrame(scaled_feature, columns=[f"{attr_name}_std"], index=sub_df_clean.index))
                    feature_names.append(f"{attr_name}_std")
            
            if not X_list: return None

            X = pd.concat(X_list, axis=1)
            y = sub_df_clean[target_variable]
            
            model = LinearRegression()
            model.fit(X, y)
            y_pred = model.predict(X)

            r2 = r2_score(y, y_pred)
            n, k = len(y), X.shape[1]
            adj_r2 = 1 - (1 - r2) * (n - 1) / (n - k - 1) if (n - k - 1) > 0 else r2
            
            regression_results = {
                'coefficients': dict(zip(feature_names, model.coef_)),
                'intercept': model.intercept_, 'rSquared': r2, 'adjustedRSquared': adj_r2,
                'rmse': np.sqrt(mean_squared_error(y, y_pred)), 'mae': mean_absolute_error(y, y_pred),
                'predictions': y_pred.tolist(), 'residuals': (y - y).tolist()
            }

            part_worths = []
            for attr_name in independent_vars:
                props = sub_attributes[attr_name]
                if props['type'] == 'categorical':
                    part_worths.append({'attribute': attr_name, 'level': props['levels'][0], 'value': 0})
                    for level in props['levels'][1:]:
                        feature_name = f"{attr_name}_{level}"
                        part_worths.append({'attribute': attr_name, 'level': level, 'value': regression_results['coefficients'].get(feature_name, 0)})
                elif props['type'] == 'numerical':
                    feature_name = f"{attr_name}_std"
                    part_worths.append({'attribute': attr_name, 'level': 'coefficient', 'value': regression_results['coefficients'].get(feature_name, 0)})

            attribute_ranges = {}
            for attr_name in independent_vars:
                props = sub_attributes[attr_name]
                if props['type'] == 'categorical':
                    level_worths = [pw['value'] for pw in part_worths if pw['attribute'] == attr_name]
                    attribute_ranges[attr_name] = max(level_worths) - min(level_worths) if level_worths else 0
                elif props['type'] == 'numerical':
                    feature_name = f"{attr_name}_std"
                    attribute_ranges[attr_name] = abs(regression_results['coefficients'].get(feature_name, 0))

            total_range = sum(attribute_ranges.values())
            importance = [{'attribute': attr, 'importance': (val / total_range) * 100 if total_range > 0 else 0} for attr, val in attribute_ranges.items()]
            importance.sort(key=lambda x: x['importance'], reverse=True)

            return {
                'regression': regression_results,
                'partWorths': part_worths,
                'importance': importance,
                'targetVariable': target_variable
            }
        
        if segment_variable and segment_variable in df.columns:
            segments = df[segment_variable].unique()
            results_by_segment = {}
            for segment in segments:
                if pd.isna(segment): continue
                sub_df = df[df[segment_variable] == segment]
                segment_result = run_conjoint_analysis(sub_df, attributes)
                if segment_result:
                    results_by_segment[str(segment)] = segment_result
            
            overall_results = run_conjoint_analysis(df, attributes)
            if overall_results:
                overall_results['segmentation'] = {
                    'segmentVariable': segment_variable,
                    'resultsBySegment': results_by_segment
                }
                final_results = overall_results
            else:
                 raise ValueError("Could not compute overall conjoint analysis.")
        else:
            final_results = run_conjoint_analysis(df, attributes)
            if not final_results:
                 raise ValueError("Conjoint analysis failed. Check data and attribute configuration.")


        print(json.dumps({'results': final_results}, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
