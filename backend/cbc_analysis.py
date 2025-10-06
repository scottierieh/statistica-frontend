

import sys
import json
import pandas as pd
import numpy as np
import statsmodels.api as sm
import statsmodels.formula.api as smf
import warnings
import re

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
    return obj

def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        attributes_def = payload.get('attributes')
        target_variable = payload.get('targetVariable')

        if not all([data, attributes_def, target_variable]):
            raise ValueError("Missing 'data', 'attributes', or 'targetVariable'")

        df = pd.DataFrame(data)

        # --- 데이터 전처리 및 포뮬러 생성 ---
        independent_vars = [attr for attr, props in attributes_def.items() if props.get('includeInAnalysis', True) and attr != target_variable]

        if not independent_vars:
            raise ValueError("No independent variables to analyze.")

        # Sanitize column names for the formula
        sanitized_cols = {col: re.sub(r'[^A-Za-z0-9_]', '_', str(col)) for col in df.columns}
        df_sanitized = df.rename(columns=sanitized_cols)
        
        target_clean = sanitized_cols.get(target_variable, target_variable)
        independent_vars_clean = [sanitized_cols.get(var, var) for var in independent_vars]

        formula_parts = [f'C(Q("{var}"))' for var in independent_vars_clean]
        formula = f'Q("{target_clean}") ~ ' + ' + '.join(formula_parts)
        
        # --- 로지스틱 회귀 모델 학습 ---
        model = smf.logit(formula=formula, data=df_sanitized).fit(disp=0)
        
        # --- 회귀 분석 결과 ---
        regression_results = {
            'rSquared': model.prsquared,
            'adjustedRSquared': 1 - (1 - model.prsquared) * (len(df) - 1) / (len(df) - len(model.params) - 1),
            'predictions': model.predict().tolist(),
            'residuals': model.resid_response.tolist(),
            'intercept': model.params.get('Intercept', 0.0),
            'coefficients': {k: v for k, v in model.params.to_dict().items()}
        }
        
        # --- 부분가치(Part-Worths) 및 중요도 계산 ---
        part_worths = []
        attribute_ranges = {}
        
        for attr_name in independent_vars:
            props = attributes_def[attr_name]
            
            # 기준 레벨(첫 번째)의 부분가치는 0
            base_level = props['levels'][0]
            part_worths.append({'attribute': attr_name, 'level': str(base_level), 'value': 0})
            
            level_worths = [0]
            for level in props['levels'][1:]:
                # statsmodels 포뮬러 형식에 맞는 파라미터 이름 검색
                clean_attr_name = sanitized_cols.get(attr_name, attr_name)
                param_key_pattern = f'C(Q("{clean_attr_name}"))[T.{level}]'
                
                worth = regression_results['coefficients'].get(param_key_pattern, 0.0)
                part_worths.append({'attribute': attr_name, 'level': str(level), 'value': worth})
                level_worths.append(worth)
            
            attribute_ranges[attr_name] = max(level_worths) - min(level_worths)

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
        
        response = {'results': final_results}
        
        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
