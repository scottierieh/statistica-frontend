

import sys
import json
import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import r2_score, mean_squared_error, mean_absolute_error
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
    elif isinstance(obj, np.bool_):
        return bool(obj)
    return obj

def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        attributes = payload.get('attributes')
        target_variable = payload.get('targetVariable')

        if not all([data, attributes, target_variable]):
            raise ValueError("Missing 'data', 'attributes', or 'targetVariable'")

        df = pd.DataFrame(data)

        # --- 1. 데이터 전처리 및 설계 행렬 생성 ---
        X_list = []
        feature_names = []
        
        independent_vars = [attr for attr, props in attributes.items() if props.get('includeInAnalysis', True) and attr != target_variable]

        for attr_name in independent_vars:
            props = attributes[attr_name]
            # 모든 속성을 문자열로 취급하고, 숫자/통화 기호를 제거하여 명확한 범주로 만듭니다.
            df[attr_name] = df[attr_name].astype(str).apply(lambda x: re.sub(r'[^a-zA-Z0-9]', '', str(x)))
            
            # 여기서 레벨도 동일하게 정리해야 합니다.
            cleaned_levels = [re.sub(r'[^a-zA-Z0-9]', '', str(level)) for level in props['levels']]
            
            dummies = pd.get_dummies(df[attr_name], prefix=attr_name, drop_first=True).astype(int)
            
            # 생성된 더미 컬럼 이름이 정리된 레벨 이름과 일치하는지 확인
            expected_dummy_cols = [f"{attr_name}_{cleaned_level}" for cleaned_level in cleaned_levels[1:]]
            
            # 실제 생성된 더미 컬럼만 X_list에 추가
            for col in dummies.columns:
                if col in expected_dummy_cols:
                    X_list.append(dummies[[col]])
                    feature_names.append(col)

        if not X_list:
             raise ValueError("No valid features to process for regression.")

        X = pd.concat(X_list, axis=1)
        y = df[target_variable]
        
        y, X = y.align(X, join='inner', axis=0)


        # --- 2. 회귀 분석 수행 ---
        model = LinearRegression()
        model.fit(X, y)

        y_pred = model.predict(X)
        residuals = y - y_pred

        # --- 3. 모델 성능 지표 계산 ---
        r2 = r2_score(y, y_pred)
        n = len(y)
        k = X.shape[1]
        adj_r2 = 1 - (1 - r2) * (n - 1) / (n - k - 1) if (n - k - 1) > 0 else r2
        
        regression_results = {
            'coefficients': dict(zip(feature_names, model.coef_)),
            'intercept': model.intercept_,
            'rSquared': r2,
            'adjustedRSquared': adj_r2,
            'rmse': np.sqrt(mean_squared_error(y, y_pred)),
            'mae': mean_absolute_error(y, y_pred),
            'predictions': y_pred.tolist(),
            'residuals': residuals.tolist()
        }

        # --- 4. 부분가치(Part-Worths) 계산 ---
        part_worths = []
        for attr_name in independent_vars:
            props = attributes[attr_name]
            
            # 기준 레벨(첫 번째)의 부분가치는 0
            part_worths.append({
                'attribute': attr_name,
                'level': str(props['levels'][0]),
                'value': 0
            })
            
            # 나머지 레벨의 부분가치는 회귀 계수
            for i in range(1, len(props['levels'])):
                level = props['levels'][i]
                cleaned_level = re.sub(r'[^a-zA-Z0-9]', '', str(level))
                feature_name = f"{attr_name}_{cleaned_level}"
                part_worths.append({
                    'attribute': attr_name,
                    'level': str(level),
                    'value': regression_results['coefficients'].get(feature_name, 0)
                })

        # --- 5. 상대적 중요도 계산 ---
        attribute_ranges = {}
        for attr_name in independent_vars:
            level_worths = [pw['value'] for pw in part_worths if pw['attribute'] == attr_name]
            if level_worths:
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

        # --- 최종 결과 조합 ---
        final_results = {
            'regression': regression_results,
            'partWorths': part_worths,
            'importance': importance,
            'featureNames': feature_names,
            'targetVariable': target_variable
        }

        print(json.dumps({'results': final_results}, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()

