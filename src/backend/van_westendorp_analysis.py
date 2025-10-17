import sys
import json
import pandas as pd
import numpy as np
import io
import base64
import warnings

# Van Westendorp PSM 패키지 import
try:
    import VanWestendorp_PriceSensitivityMeter as VWPSM
except ImportError:
    print(json.dumps({"error": "Please install: pip install VanWestendorp-PriceSensitivityMeter"}), file=sys.stderr)
    sys.exit(1)

warnings.filterwarnings('ignore')

def main():
    try:
        # Read input data
        payload = json.load(sys.stdin)
        data = payload.get('data')
        
        # Column names (can be customized via input)
        too_cheap_col = payload.get('too_cheap_col', 'Too Cheap')
        cheap_col = payload.get('cheap_col', 'Cheap') 
        expensive_col = payload.get('expensive_col', 'Expensive')
        too_expensive_col = payload.get('too_expensive_col', 'Too Expensive')
        
        if not data:
            raise ValueError("Missing required data.")
        
        # Create DataFrame
        df = pd.DataFrame(data)
        
        # Define columns in correct order for VWPSM package
        my_cols = [too_cheap_col, cheap_col, expensive_col, too_expensive_col]
        
        # Validate and clean data
        for col in my_cols:
            if col not in df.columns:
                raise ValueError(f"Required column '{col}' not found.")
            df[col] = pd.to_numeric(df[col], errors='coerce')
        
        # Remove NaN rows
        df_clean = df[my_cols].dropna()
        
        if len(df_clean) < 10:
            raise ValueError(f"Need at least 10 responses, found {len(df_clean)}.")
        
        # ========================================
        # 핵심: VWPSM 패키지 직접 사용
        # ========================================
        
        # 패키지가 알아서 모든 계산과 그래프를 처리
        results = VWPSM.results(df_clean, my_cols)
        
        # 패키지가 자동으로 생성한 그래프를 base64로 변환
        # (패키지가 그래프를 표시하므로 현재 figure를 캡처)
        import matplotlib.pyplot as plt
        
        # 현재 활성화된 모든 figure를 가져옴
        figures = [plt.figure(i) for i in plt.get_fignums()]
        
        plots = {}
        if figures:
            # 첫 번째 figure를 PSM plot으로 저장
            buf = io.BytesIO()
            figures[0].savefig(buf, format='png', dpi=100, bbox_inches='tight')
            buf.seek(0)
            plots['psm_plot'] = base64.b64encode(buf.read()).decode('utf-8')
            buf.close()
            
            # 두 번째 figure가 있으면 acceptance plot으로 저장
            if len(figures) > 1:
                buf = io.BytesIO()
                figures[1].savefig(buf, format='png', dpi=100, bbox_inches='tight')
                buf.seek(0)
                plots['acceptance_plot'] = base64.b64encode(buf.read()).decode('utf-8')
                buf.close()
        
        # 모든 figure 닫기
        plt.close('all')
        
        # 결과 반환
        response = {
            'message': 'Analysis completed using VWPSM package',
            'plots': plots,
            'data_summary': {
                'total_responses': len(df_clean),
                'columns_used': my_cols
            }
        }
        
        # 패키지가 결과를 콘솔에 출력하므로, 
        # 추가 정보가 필요하면 패키지의 return 값을 파싱
        if results is not None:
            response['package_results'] = str(results)
        
        print(json.dumps(response))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
    