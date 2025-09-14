
import sys
import json
import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import r2_score, mean_squared_error, mean_absolute_error

def _to_native_type(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        if np.isnan(obj):
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
        
        # 분석에 포함될 독립변수만 필터링
        independent_vars = [attr for attr, props in attributes.items() if props.get('includeInAnalysis', True) and attr != target_variable]

        for attr_name in independent_vars:
            props = attributes[attr_name]
            if props['type'] == 'categorical':
                # 더미 변수 생성 (첫 번째 레벨은 기준선으로 제외)
                dummies = pd.get_dummies(df[attr_name], prefix=attr_name, drop_first=True).astype(int)
                X_list.append(dummies)
                feature_names.extend(dummies.columns.tolist())
            elif props['type'] == 'numerical':
                # 수치형 변수 표준화
                scaler = StandardScaler()
                scaled_feature = scaler.fit_transform(df[[attr_name]])
                X_list.append(pd.DataFrame(scaled_feature, columns=[f"{attr_name}_std"]))
                feature_names.append(f"{attr_name}_std")

        X = pd.concat(X_list, axis=1)
        y = df[target_variable]

        # --- 2. 회귀 분석 수행 ---
        model = LinearRegression()
        model.fit(X, y)

        y_pred = model.predict(X)

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
            'mae': mean_absolute_error(y, y_pred)
        }

        # --- 4. 부분가치(Part-Worths) 계산 ---
        part_worths = []
        for attr_name in independent_vars:
            props = attributes[attr_name]
            if props['type'] == 'categorical':
                # 기준 레벨(첫 번째)의 부분가치는 0
                part_worths.append({
                    'attribute': attr_name,
                    'level': props['levels'][0],
                    'value': 0
                })
                # 나머지 레벨의 부분가치는 회귀 계수
                for level in props['levels'][1:]:
                    feature_name = f"{attr_name}_{level}"
                    part_worths.append({
                        'attribute': attr_name,
                        'level': level,
                        'value': regression_results['coefficients'].get(feature_name, 0)
                    })
            elif props['type'] == 'numerical':
                 # 수치형 변수의 계수는 그 자체로 중요도를 나타냄
                 feature_name = f"{attr_name}_std"
                 part_worths.append({
                     'attribute': attr_name,
                     'level': 'coefficient',
                     'value': regression_results['coefficients'].get(feature_name, 0)
                 })


        # --- 5. 상대적 중요도 계산 ---
        attribute_ranges = {}
        for attr_name in independent_vars:
            props = attributes[attr_name]
            if props['type'] == 'categorical':
                level_worths = [pw['value'] for pw in part_worths if pw['attribute'] == attr_name]
                attribute_ranges[attr_name] = max(level_worths) - min(level_worths)
            elif props['type'] == 'numerical':
                # 수치형 변수의 범위는 계수의 절대값으로 근사
                feature_name = f"{attr_name}_std"
                attribute_ranges[attr_name] = abs(regression_results['coefficients'].get(feature_name, 0))

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

        print(json.dumps(final_results, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
