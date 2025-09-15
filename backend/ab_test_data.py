
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

# CSV 문자열로 변환
csv_data = df.to_csv(index=False, lineterminator='\\n')

# TypeScript 파일로 저장
output_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', 'lib', 'example-datasets')
os.makedirs(output_dir, exist_ok=True)
output_path = os.path.join(output_dir, 'ab-test-data.ts')

ts_content = f'export const abTestData = `{csv_data}`;'

with open(output_path, 'w') as f:
    f.write(ts_content)

print(f"'{output_path}'에 A/B 테스트 데이터 생성 완료.")
