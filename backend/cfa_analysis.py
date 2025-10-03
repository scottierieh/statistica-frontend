
import sys
import json
import pandas as pd
import numpy as np
from scipy.optimize import minimize
from scipy import stats
import warnings

# SEMopy가 설치되어 있는지 확인
try:
    from semopy import Model
    SEMOPY_AVAILABLE = True
except ImportError:
    SEMOPY_AVAILABLE = False

warnings.filterwarnings('ignore')

def _to_native_type(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    return obj

def main():
    if not SEMOPY_AVAILABLE:
        print(json.dumps({"error": "The 'semopy' library is not installed in the backend. Please install it to use this feature."}), file=sys.stderr)
        sys.exit(1)
        
    try:
        payload = json.load(sys.stdin)
        data_json = payload.get('data')
        model_spec_str = payload.get('model_spec')

        if not all([data_json, model_spec_str]):
            raise ValueError("Missing data or model specification.")

        data = pd.DataFrame(data_json)

        # 모델 생성 및 데이터 로드
        model = Model(model_spec_str)
        model.load_dataset(data)

        # 모델 추정
        model.fit()

        # 결과 추출
        stats_df = model.inspect()
        estimates = stats_df.to_dict('records')
        
        fit_indices = model.calc_stats().to_dict()

        response = {
            "results": {
                "estimates": estimates,
                "fit_indices": fit_indices
            }
        }
        
        # NaN 값을 None으로 변환 후 출력
        cleaned_response = json.loads(json.dumps(response, default=_to_native_type))
        print(json.dumps(cleaned_response))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
