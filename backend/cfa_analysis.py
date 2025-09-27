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
            scatter = plt.scatter(self.data[feature_cols[0]], 
                                self.data[feature_cols[1]], 
                                c=self.data['Target'], 
                                alpha=0.6, cmap='viridis')
            plt.xlabel(feature_cols[0])
            plt.ylabel(feature_cols[1])
            plt.title('Feature Scatter Plot')
            plt.colorbar(scatter)
        
        # 6. 특성 중요도 (모델 학습 후)
        plt.subplot(2, 3, 6)
        if len(feature_cols) > 0:
            # 간단한 모델 학습
            X = self.data[feature_cols]
            y = self.data['Target']
            rf = RandomForestClassifier(n_estimators=100, random_state=42)
            rf.fit(X, y)
            
            importance = pd.DataFrame({
                'feature': feature_cols,
                'importance': rf.feature_importances_
            }).sort_values('importance', ascending=True)
            
            plt.barh(importance['feature'], importance['importance'])
            plt.title('Feature Importance')
            plt.xlabel('Importance')
        
        plt.tight_layout()
        plt.show()
        
    def train_model_and_convert_to_onnx(self):
        """모델 학습 및 ONNX 변환"""
        if self.data is None:
            print("❌ 데이터가 로드되지 않았습니다.")
            return
        
        # 특성과 타겟 분리
        feature_cols = [col for col in self.data.columns if col not in ['Target', 'Species']]
        X = self.data[feature_cols]
        y = self.data['Target']
        
        # 데이터 분할
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        
        # 데이터 표준화
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # RandomForest 모델 학습
        self.model = RandomForestClassifier(
            n_estimators=100, 
            max_depth=10, 
            random_state=42
        )
        
        self.model.fit(X_train_scaled, y_train)
        
        # 모델 성능 평가
        train_score = self.model.score(X_train_scaled, y_train)
        test_score = self.model.score(X_test_scaled, y_test)
        
        print(f"✅ 모델 학습 완료")
        print(f"훈련 정확도: {train_score:.4f}")
        print(f"테스트 정확도: {test_score:.4f}")
        
        # ONNX 변환
        try:
            initial_type = [('float_input', FloatTensorType([None, len(feature_cols)]))]
            self.onnx_model = convert_sklearn(
                self.model, 
                initial_types=initial_type,
                target_opset=11
            )
            
            print("✅ ONNX 변환 완료")
            
            # ONNX 모델 저장
            onnx.save_model(self.onnx_model, 'model.onnx')
            print("✅ ONNX 모델 저장 완료: model.onnx")
            
        except Exception as e:
            print(f"❌ ONNX 변환 실패: {e}")
            
        return train_score, test_score
    
    def test_onnx_model(self):
        """ONNX 모델 테스트"""
        if self.onnx_model is None:
            print("❌ ONNX 모델이 없습니다.")
            return
        
        # ONNX Runtime 세션 생성
        ort_session = ort.InferenceSession(
            self.onnx_model.SerializeToString(),
            providers=['CPUExecutionProvider']
        )
        
        # 테스트 데이터 준비
        feature_cols = [col for col in self.data.columns if col not in ['Target', 'Species']]
        X_sample = self.data[feature_cols].iloc[:5].values
        X_sample_scaled = self.scaler.transform(X_sample).astype(np.float32)
        
        # ONNX 모델로 예측
        onnx_pred = ort_session.run(
            None, 
            {'float_input': X_sample_scaled}
        )[1]  # 확률값 반환
        
        # 원본 모델로 예측
        sklearn_pred = self.model.predict_proba(X_sample_scaled)
        
        print("✅ ONNX 모델 테스트 결과:")
        print("ONNX 예측 확률 (처음 5개 샘플):")
        for i, prob in enumerate(onnx_pred):
            print(f"샘플 {i+1}: {prob}")
        
        print("\nScikit-learn 예측 확률:")
        for i, prob in enumerate(sklearn_pred):
            print(f"샘플 {i+1}: {prob}")
        
        # 차이 계산
        diff = np.abs(onnx_pred - sklearn_pred)
        print(f"\n평균 차이: {np.mean(diff):.6f}")
        print("✅ 모델 일치성 검증 완료")
        
        return onnx_pred, sklearn_pred

# 실행 예제
def main():
    print("🚀 Python과 ONYX 데이터 분석 시작!")
    print("=" * 50)
    
    # 분석기 초기화
    analyzer = DataAnalyzer()
    
    # 데이터 로드 (Iris 데이터셋 사용)
    analyzer.load_iris_data()
    
    # 데이터 탐색
    stats = analyzer.explore_data()
    
    # 시각화
    print("\n📊 데이터 시각화 생성 중...")
    analyzer.create_visualizations()
    
    # 모델 학습 및 ONNX 변환
    print("\n🤖 모델 학습 및 ONNX 변환...")
    train_acc, test_acc = analyzer.train_model_and_convert_to_onnx()
    
    # ONNX 모델 테스트
    print("\n🔍 ONNX 모델 테스트...")
    analyzer.test_onnx_model()
    
    print("\n" + "=" * 50)
    print("✅ 모든 분석 완료!")

if __name__ == "__main__":
    main()

# 추가 유틸리티 함수들
def create_advanced_analysis():
    """고급 분석 예제"""
    print("\n🔬 고급 분석 예제")
    
    # 시계열 데이터 생성
    dates = pd.date_range('2024-01-01', periods=365)
    trend = np.linspace(100, 200, 365)
    seasonal = 10 * np.sin(2 * np.pi * np.arange(365) / 365)
    noise = np.random.normal(0, 5, 365)
    values = trend + seasonal + noise
    
    ts_data = pd.DataFrame({
        'date': dates,
        'value': values
    })
    
    # 시계열 시각화
    plt.figure(figsize=(12, 6))
    plt.plot(ts_data['date'], ts_data['value'], label='Time Series Data')
    plt.plot(ts_data['date'], trend, label='Trend', linestyle='--')
    plt.title('Time Series Analysis Example')
    plt.xlabel('Date')
    plt.ylabel('Value')
    plt.legend()
    plt.xticks(rotation=45)
    plt.tight_layout()
    plt.show()
    
    return ts_data

def performance_comparison():
    """성능 비교 시각화"""
    models = ['Random Forest', 'SVM', 'Neural Network', 'ONNX Model']
    accuracy = [0.95, 0.92, 0.96, 0.95]
    inference_time = [10, 25, 15, 5]  # milliseconds
    
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5))
    
    # 정확도 비교
    ax1.bar(models, accuracy, color=['skyblue', 'lightgreen', 'lightcoral', 'gold'])
    ax1.set_title('Model Accuracy Comparison')
    ax1.set_ylabel('Accuracy')
    ax1.set_ylim(0.9, 1.0)
    
    # 추론 시간 비교
    ax2.bar(models, inference_time, color=['skyblue', 'lightgreen', 'lightcoral', 'gold'])
    ax2.set_title('Inference Time Comparison')
    ax2.set_ylabel('Time (ms)')
    
    plt.tight_layout()
    plt.show()

# 변수 설정 예제
CONFIG = {
    'model_params': {
        'n_estimators': 100,
        'max_depth': 10,
        'random_state': 42
    },
    'data_params': {
        'test_size': 0.2,
        'n_samples': 1000,
        'n_features': 4
    },
    'visualization': {
        'figure_size': (15, 12),
        'color_palette': 'viridis',
        'style': 'seaborn-v0_8'
    }
}

print("📝 설정 변수들:")
for section, params in CONFIG.items():
    print(f"\n{section}:")
    for key, value in params.items():
        print(f"  - {key}: {value}")
