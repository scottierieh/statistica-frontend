
import pandas as pd
import numpy as np
import os

# --- 데이터 생성 ---
np.random.seed(42)
n_samples = 100

# 그룹 A (기존 디자인)
group_a = pd.DataFrame({
    'group': 'A',
    'time_on_site': np.random.normal(loc=120, scale=30, size=n_samples).clip(10) # 평균 120초
})

# 그룹 B (새로운 디자인)
group_b = pd.DataFrame({
    'group': 'B',
    'time_on_site': np.random.normal(loc=135, scale=35, size=n_samples).clip(10) # 평균 135초 (개선)
})

# 데이터 합치기
df = pd.concat([group_a, group_b], ignore_index=True)

# CSV 파일로 저장
# 스크립트의 위치를 기준으로 backend/example-datasets 폴더에 저장
output_dir = os.path.dirname(os.path.abspath(__file__))
output_path = os.path.join(output_dir, 'ab-test-data.csv')
df.to_csv(output_path, index=False)

print(f"'{output_path}'에 A/B 테스트 데이터 생성 완료.")
