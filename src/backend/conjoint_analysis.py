
import sys
import json
import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import r2_score, log_loss
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

        # CBC 데이터는 항상 'chosen' 컬럼을 사용하므로 is_choice_based를 True로 설정
        is_choice_based = (target_variable == 'chosen')

        if df.empty:
            raise ValueError("No valid data after processing")

        def run_conjoint_analysis(sub_df, sub_attributes):
            X_list, feature_names, original_levels_map = [], [], {}
            
            independent_vars = [
                attr for attr, props in sub_attributes.items() 
                if props.get('includeInAnalysis', True) and attr != target_variable
            ]
            
            if not independent_vars:
                return None
            
            required_cols = independent_vars + [target_variable]
            sub_df_clean = sub_df[required_cols].copy()
            
            for col in independent_vars:
                sub_df_clean[col] = sub_df_clean[col].astype(str).str.strip()
                sub_df_clean = sub_df_clean[sub_df_clean[col] != '']
            
            sub_df_clean[target_variable] = pd.to_numeric(sub_df_clean[target_variable], errors='coerce')
            sub_df_clean = sub_df_clean.dropna(subset=[target_variable])

            if sub_df_clean.empty or len(sub_df_clean) < 10:
                return None

            for attr_name in independent_vars:
                props = sub_attributes[attr_name]
                
                if props['type'] == 'categorical':
                    sub_df_clean[attr_name] = sub_df_clean[attr_name].astype('category')
                    original_levels_map[attr_name] = sub_df_clean[attr_name].cat.categories.tolist()
                    
                    if len(original_levels_map[attr_name]) < 2:
                        continue
                    
                    dummies = pd.get_dummies(
                        sub_df_clean[attr_name], 
                        prefix=attr_name, 
                        drop_first=True
                    ).astype(int)
                    X_list.append(dummies)
                    feature_names.extend(dummies.columns.tolist())
                    
                elif props['type'] == 'numerical':
                    try:
                        numeric_col = pd.to_numeric(sub_df_clean[attr_name], errors='coerce')
                        if numeric_col.notna().sum() < 2:
                            continue
                        
                        scaler = StandardScaler()
                        scaled_feature = scaler.fit_transform(numeric_col.values.reshape(-1, 1))
                        X_df = pd.DataFrame(
                            scaled_feature, 
                            columns=[f"{attr_name}_std"], 
                            index=sub_df_clean.index
                        )
                        X_list.append(X_df)
                        feature_names.append(f"{attr_name}_std")
                    except Exception:
                        continue
            
            if not X_list:
                return None

            X = pd.concat(X_list, axis=1)
            y = sub_df_clean[target_variable]
            
            common_idx = X.index.intersection(y.index)
            X = X.loc[common_idx]
            y = y.loc[common_idx]
            
            if len(X) < len(feature_names) + 1:
                return None

            try:
                if is_choice_based:
                    model = LogisticRegression(
                        random_state=42, 
                        solver='lbfgs', 
                        max_iter=1000
                    )
                    model.fit(X, y)
                    y_pred_prob = model.predict_proba(X)[:, 1]
                    
                    log_likelihood_full = -log_loss(y, y_pred_prob, normalize=False)
                    log_likelihood_null = -log_loss(y, [y.mean()] * len(y), normalize=False)
                    r_squared = 1 - (log_likelihood_full / log_likelihood_null) if log_likelihood_null != 0 else 0
                    adj_r_squared = r_squared
                    
                    coefficients = np.concatenate([model.intercept_, model.coef_.flatten()])
                else:
                    model = LinearRegression()
                    model.fit(X, y)
                    y_pred = model.predict(X)
                    r_squared = r2_score(y, y_pred)
                    
                    n = len(y)
                    p = X.shape[1]
                    adj_r_squared = 1 - (1 - r_squared) * (n - 1) / (n - p - 1) if (n - p - 1) > 0 else 0
                    
                    coefficients = np.concatenate([[model.intercept_], model.coef_])
            except Exception as e:
                return None
            
            full_coeffs = {'intercept': _to_native_type(coefficients[0])}
            coeff_index = 1
            
            for attr_name in independent_vars:
                if sub_attributes[attr_name]['type'] == 'categorical':
                    levels = original_levels_map.get(attr_name, [])
                    if not levels:
                        continue
                    
                    full_coeffs[f"{attr_name}_{levels[0]}"] = 0
                    
                    for level in levels[1:]:
                        if coeff_index < len(coefficients):
                            full_coeffs[f"{attr_name}_{level}"] = _to_native_type(coefficients[coeff_index])
                            coeff_index += 1
                            
                elif sub_attributes[attr_name]['type'] == 'numerical':
                    if coeff_index < len(coefficients):
                        full_coeffs[f"{attr_name}_std"] = _to_native_type(coefficients[coeff_index])
                        coeff_index += 1

            regression_results = {
                'coefficients': full_coeffs,
                'intercept': _to_native_type(coefficients[0]),
                'rSquared': _to_native_type(r_squared),
                'adjustedRSquared': _to_native_type(adj_r_squared),
                'modelType': 'logistic' if is_choice_based else 'linear',
                'sampleSize': len(y)
            }
            
            part_worths = []
            for attr_name in independent_vars:
                props = sub_attributes[attr_name]
                if props['type'] == 'categorical':
                    level_names = original_levels_map.get(attr_name, [])
                    level_worths = []
                    
                    for level in level_names:
                        coef_name = f"{attr_name}_{level}"
                        level_worths.append(full_coeffs.get(coef_name, 0))
                    
                    if not level_worths:
                        continue
                    
                    mean_worth = np.mean(level_worths)
                    zero_centered_worths = [w - mean_worth for w in level_worths]

                    for i, level in enumerate(level_names):
                        part_worths.append({
                            'attribute': attr_name,
                            'level': str(level),
                            'value': _to_native_type(zero_centered_worths[i])
                        })

            attribute_ranges = {}
            for attr_name in independent_vars:
                level_worths = [pw['value'] for pw in part_worths if pw['attribute'] == attr_name]
                if level_worths:
                    attribute_ranges[attr_name] = max(level_worths) - min(level_worths)
                else:
                    attribute_ranges[attr_name] = 0

            total_range = sum(attribute_ranges.values())
            importance = []
            for attr, val in attribute_ranges.items():
                imp_value = (val / total_range) * 100 if total_range > 0 else 0
                importance.append({
                    'attribute': attr,
                    'importance': _to_native_type(imp_value)
                })
            importance.sort(key=lambda x: x['importance'], reverse=True)
            
            optimal_profile = {}
            total_utility = regression_results['intercept']
            
            for attr_name in independent_vars:
                if sub_attributes[attr_name]['type'] == 'categorical':
                    attr_worths = [p for p in part_worths if p['attribute'] == attr_name]
                    if attr_worths:
                        best_level = max(attr_worths, key=lambda x: x['value'])
                        optimal_profile[attr_name] = best_level['level']
                        total_utility += best_level['value']

            return {
                'regression': regression_results,
                'partWorths': part_worths,
                'importance': importance,
                'targetVariable': target_variable,
                'optimalProduct': {
                    'config': optimal_profile,
                    'totalUtility': _to_native_type(total_utility)
                }
            }

        def run_simulation(scenarios_to_sim, analysis_res):
            if not scenarios_to_sim or not analysis_res:
                return None
            
            def predict_utility(profile):
                utility = analysis_res['regression']['intercept']
                for attr, level in profile.items():
                    if attr == 'name':
                        continue
                    pw = next(
                        (p for p in analysis_res['partWorths'] 
                         if p['attribute'] == attr and str(p['level']) == str(level)), 
                        None
                    )
                    if pw:
                        utility += pw['value']
                return utility
            
            scenario_utilities = [predict_utility(sc) for sc in scenarios_to_sim]
            exp_utilities = np.exp(scenario_utilities)
            sum_exp_utilities = np.sum(exp_utilities)

            if sum_exp_utilities == 0:
                return None

            market_shares = (exp_utilities / sum_exp_utilities) * 100
            
            return [{
                'name': sc.get('name', f'Scenario {i+1}'),
                'marketShare': _to_native_type(share)
            } for i, (sc, share) in enumerate(zip(scenarios_to_sim, market_shares))]

        if segment_variable and segment_variable in df.columns:
            segments = df[segment_variable].unique()
            results_by_segment = {}
            
            for segment in segments:
                if pd.isna(segment):
                    continue
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

    