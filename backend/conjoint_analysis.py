

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
        scenarios = payload.get('scenarios')

        if not all([data, attributes, target_variable]):
            raise ValueError("Missing 'data', 'attributes', or 'targetVariable'")

        df = pd.DataFrame(data)

        def run_conjoint_analysis(sub_df, sub_attributes):
            X_list, feature_names, original_levels_map = [], [], {}
            
            independent_vars = [attr for attr, props in sub_attributes.items() if props.get('includeInAnalysis', True) and attr != target_variable]
            
            all_cols_to_check = independent_vars + [target_variable]
            sub_df_clean = sub_df[all_cols_to_check].copy().dropna()
            
            if sub_df_clean.empty: return None

            for attr_name in independent_vars:
                props = sub_attributes[attr_name]
                if props['type'] == 'categorical':
                    sub_df_clean[attr_name] = sub_df_clean[attr_name].astype('category')
                    original_levels_map[attr_name] = sub_df_clean[attr_name].cat.categories.tolist()
                    dummies = pd.get_dummies(sub_df_clean[attr_name], prefix=attr_name, drop_first=False).astype(int)
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

            regression_results = {
                'coefficients': dict(zip(feature_names, model.coef_)),
                'intercept': model.intercept_, 'rSquared': r2_score(y, y_pred),
                'adjustedRSquared': 1 - (1 - r2_score(y, y_pred)) * (len(y) - 1) / (len(y) - X.shape[1] - 1) if (len(y) - X.shape[1] - 1) > 0 else 0,
                'rmse': np.sqrt(mean_squared_error(y, y_pred)), 'mae': mean_absolute_error(y, y_pred),
                'predictions': y_pred.tolist(), 'residuals': (y - y_pred).tolist()
            }
            
            # Zero-centered part-worths
            part_worths = []
            for attr_name in independent_vars:
                props = sub_attributes[attr_name]
                if props['type'] == 'categorical':
                    level_names = original_levels_map.get(attr_name, [])
                    level_worths = []
                    for level in level_names:
                        coef_name = f"{attr_name}_{level}"
                        level_worths.append(regression_results['coefficients'].get(coef_name, 0))
                    
                    mean_worth = np.mean(level_worths) if level_worths else 0
                    zero_centered_worths = [w - mean_worth for w in level_worths]

                    for i, level in enumerate(level_names):
                        part_worths.append({'attribute': attr_name, 'level': level, 'value': zero_centered_worths[i]})

            attribute_ranges = {}
            for attr_name in independent_vars:
                 level_worths = [pw['value'] for pw in part_worths if pw['attribute'] == attr_name]
                 attribute_ranges[attr_name] = max(level_worths) - min(level_worths) if level_worths else 0

            total_range = sum(attribute_ranges.values())
            importance = [{'attribute': attr, 'importance': (val / total_range) * 100 if total_range > 0 else 0} for attr, val in attribute_ranges.items()]
            importance.sort(key=lambda x: x['importance'], reverse=True)
            
            optimal_profile = {}
            total_utility = regression_results['intercept']
            for attr_name in independent_vars:
                if sub_attributes[attr_name]['type'] == 'categorical':
                    attr_worths = [p for p in part_worths if p['attribute'] == attr_name]
                    if not attr_worths: continue
                    best_level = max(attr_worths, key=lambda x: x['value'])
                    optimal_profile[attr_name] = best_level['level']
                    total_utility += best_level['value']

            return {
                'regression': regression_results,
                'partWorths': part_worths,
                'importance': importance,
                'targetVariable': target_variable,
                'optimalProduct': { 'config': optimal_profile, 'totalUtility': total_utility }
            }

        def run_simulation(scenarios_to_sim, analysis_res):
            def predict_utility(profile):
                utility = analysis_res['regression']['intercept']
                for attr, level in profile.items():
                    if attr == 'name': continue
                    pw = next((p for p in analysis_res['partWorths'] if p['attribute'] == attr and p['level'] == level), None)
                    if pw:
                        utility += pw['value']
                return utility
            
            scenario_utilities = [predict_utility(sc) for sc in scenarios_to_sim]
            exp_utilities = np.exp(scenario_utilities)
            sum_exp_utilities = np.sum(exp_utilities)

            if sum_exp_utilities == 0: return None

            market_shares = (exp_utilities / sum_exp_utilities) * 100
            
            return [{'name': sc['name'], 'marketShare': share} for sc, share in zip(scenarios_to_sim, market_shares)]

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
        
        if scenarios and final_results:
            final_results['simulation'] = run_simulation(scenarios, final_results)

        print(json.dumps({'results': final_results}, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
