# Python을 활용한 CFA(Confirmatory Factor Analysis) 구현
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.datasets import make_classification, load_iris
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
import onnx
import onnxruntime as ort
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType
import warnings
warnings.filterwarnings('ignore')

# 한글 폰트 설정 (matplotlib)
plt.rcParams['font.family'] = ['DejaVu Sans']
plt.style.use('seaborn-v0_8')

class DataAnalyzer:
    def __init__(self):
        self.data = None
        self.model = None
        self.onnx_model = None
        self.scaler = StandardScaler()
        
    def generate_sample_data(self, n_samples=1000, n_features=4):
        """샘플 데이터 생성"""
        # 분류 데이터셋 생성
        X, y = make_classification(
            n_samples=n_samples, 
            n_features=n_features,
            n_informative=3,
            n_redundant=1,
            n_clusters_per_class=1,
            random_state=42
        )
        
        # 데이터프레임으로 변환
        feature_names = [f'Feature_{i+1}' for i in range(n_features)]
        self.data = pd.DataFrame(X, columns=feature_names)
        self.data['Target'] = y
        
        print(f"✅ 샘플 데이터 생성 완료: {n_samples}개 샘플, {n_features}개 특성")
        return self.data
    
    def load_iris_data(self):
        """Iris 데이터셋 로드"""
        iris = load_iris()
        self.data = pd.DataFrame(iris.data, columns=iris.feature_names)
        self.data['Target'] = iris.target
        self.data['Species'] = [iris.target_names[i] for i in iris.target]
        
        print("✅ Iris 데이터셋 로드 완료")
        return self.data
    
    def explore_data(self):
        """데이터 탐색적 분석"""
        if self.data is None:
            print("❌ 데이터가 로드되지 않았습니다.")
            return
        
        print("\n=== 데이터 기본 정보 ===")
        print(f"데이터 크기: {self.data.shape}")
        print(f"결측값: {self.data.isnull().sum().sum()}")
        print("\n=== 기술 통계 ===")
        print(self.data.describe())
        
        return self.data.describe()
    
    def create_visualizations(self):
        """데이터 시각화"""
        if self.data is None:
            print("❌ 데이터가 로드되지 않았습니다.")
            return
        
        # Figure 설정
        fig = plt.figure(figsize=(15, 12))
        
        # 1. 상관관계 히트맵
        plt.subplot(2, 3, 1)
        numeric_cols = self.data.select_dtypes(include=[np.number]).columns
        corr_matrix = self.data[numeric_cols].corr()
        sns.heatmap(corr_matrix, annot=True, cmap='coolwarm', center=0, 
                   square=True, fmt='.2f')
        plt.title('Feature Correlation Heatmap')
        
        # 2. 타겟 분포
        plt.subplot(2, 3, 2)
        target_counts = self.data['Target'].value_counts()
        plt.pie(target_counts.values, labels=target_counts.index, autopct='%1.1f%%')
        plt.title('Target Distribution')
        
        # 3. 특성별 분포 (첫 번째 특성)
        plt.subplot(2, 3, 3)
        feature_cols = [col for col in self.data.columns if col not in ['Target', 'Species']]
        if feature_cols:
            self.data[feature_cols[0]].hist(bins=30, alpha=0.7)
            plt.title(f'{feature_cols[0]} Distribution')
            plt.xlabel(feature_cols[0])
            plt.ylabel('Frequency')
        
        # 4. 박스플롯 (타겟별 첫 번째 특성)
        plt.subplot(2, 3, 4)
        if feature_cols:
            sns.boxplot(data=self.data, x='Target', y=feature_cols[0])
            plt.title(f'{feature_cols[0]} by Target')
        
        # 5. 산점도 (첫 두 특성)
        plt.subplot(2, 3, 5)
        if len(feature_cols) >= 2:
            scatter = 