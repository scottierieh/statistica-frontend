#!/usr/bin/env python3
"""
개선된 SAR (Spatial Autoregressive) Model 백엔드
- 실제 위도/경도 좌표 사용
- 다양한 공간 가중 행렬 생성 방식 지원
- 공간 자기상관 진단 포함
"""

import sys
import json
import numpy as np
import pandas as pd
from scipy.optimize import minimize
from scipy.sparse import issparse
from scipy.spatial.distance import cdist
import warnings

warnings.filterwarnings('ignore')


def _to_native_type(obj):
    """NumPy 타입을 JSON 직렬화 가능한 타입으로 변환"""
    if isinstance(obj, np.integer):
        return int(obj)
    if isinstance(obj, (np.floating, float)):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return float(obj)
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    if isinstance(obj, bool) or isinstance(obj, np.bool_):
        return bool(obj)
    return obj


def haversine_distance_matrix(coords):
    """
    위도/경도 좌표로부터 실제 거리(km) 행렬 계산
    
    Parameters:
    - coords: (n, 2) 배열, [latitude, longitude]
    
    Returns:
    - dist: (n, n) 거리 행렬 (km)
    """
    lat = np.radians(coords[:, 0])
    lon = np.radians(coords[:, 1])
    
    n = len(coords)
    dist = np.zeros((n, n))
    
    for i in range(n):
        dlat = lat - lat[i]
        dlon = lon - lon[i]
        a = np.sin(dlat/2)**2 + np.cos(lat[i]) * np.cos(lat) * np.sin(dlon/2)**2
        c = 2 * np.arcsin(np.sqrt(np.clip(a, 0, 1)))  # clip for numerical stability
        dist[i] = 6371 * c  # Earth radius in km
    
    return dist


def create_spatial_weights_from_coords(lat, lon, method='knn', k=5, threshold=50, alpha=1.0):
    """
    실제 위도/경도 좌표로부터 공간 가중 행렬 생성
    
    Parameters:
    - lat, lon: 위도/경도 배열
    - method: 'knn' (k-nearest neighbors), 'distance' (역거리), 'threshold' (임계값)
    - k: KNN 방식에서 이웃 개수 (기본값: 5)
    - threshold: 거리 임계값 (km, 기본값: 50)
    - alpha: 역거리 가중치의 지수 (기본값: 1.0)
    
    Returns:
    - W: (n, n) row-normalized 공간 가중 행렬
    """
    coords = np.column_stack([lat, lon])
    n = len(coords)
    
    # 실제 거리 계산
    dist_matrix = haversine_distance_matrix(coords)
    
    W = np.zeros((n, n))
    
    if method == 'knn':
        # K-nearest neighbors
        for i in range(n):
            # 자기 자신 제외하고 가장 가까운 k개 선택
            neighbors = np.argsort(dist_matrix[i])[1:k+1]
            W[i, neighbors] = 1
            
    elif method == 'distance':
        # 역거리 가중치 (Inverse Distance Weighting)
        for i in range(n):
            for j in range(n):
                if i != j and dist_matrix[i, j] > 0:
                    W[i, j] = 1 / (dist_matrix[i, j] ** alpha)
                    
    elif method == 'threshold':
        # 임계값 이내의 모든 지점
        W = (dist_matrix < threshold).astype(float)
        np.fill_diagonal(W, 0)
    
    else:
        raise ValueError(f"Unknown method: {method}")
    
    # Row-normalize (각 행의 합이 1이 되도록)
    row_sums = W.sum(axis=1)
    row_sums[row_sums == 0] = 1  # 이웃이 없는 경우 방지
    W = W / row_sums[:, np.newaxis]
    
    return W


def morans_i(y, W):
    """
    Global Moran's I 통계량 계산
    공간 자기상관의 존재 여부를 측정
    
    Returns:
    - I: Moran's I 값 (-1 ~ 1)
      - I > 0: 양의 공간 자기상관 (유사한 값끼리 군집)
      - I ≈ 0: 공간 자기상관 없음
      - I < 0: 음의 공간 자기상관 (상이한 값끼리 인접)
    """
    n = len(y)
    y_mean = np.mean(y)
    y_dev = y - y_mean
    
    numerator = np.sum(W * np.outer(y_dev, y_dev))
    denominator = np.sum(y_dev ** 2)
    
    if denominator == 0:
        return 0.0
    
    S0 = np.sum(W)
    if S0 == 0:
        return 0.0
    
    I = (n / S0) * (numerator / denominator)
    
    return I


class SARModel:
    """Spatial Autoregressive (Lag) Model"""
    
    def __init__(self):
        self.rho = None
        self.beta = None
        self.sigma2 = None
        self.loglik = None
        self.n = None
        self.k = None
        self.converged = False

    def fit(self, y, X, W, method='ml', rho_bounds=(-0.99, 0.99)):
        """
        SAR 모델 추정
        
        Model: y = ρWy + Xβ + ε
        
        Parameters:
        - y: 종속변수 (n,)
        - X: 독립변수 행렬 (n, k) - intercept 포함
        - W: 공간 가중 행렬 (n, n) - row-normalized
        - method: 'ml' (Maximum Likelihood)
        - rho_bounds: ρ의 범위
        """
        y = np.asarray(y).flatten()
        X = np.asarray(X)
        W = np.asarray(W) if not issparse(W) else W.toarray()
        
        self.n = len(y)
        self.k = X.shape[1]
        
        if X.shape[0] != self.n:
            raise ValueError(f"X has {X.shape[0]} rows but y has {self.n}")
        if W.shape[0] != self.n or W.shape[1] != self.n:
            raise ValueError(f"W must be {self.n}x{self.n}")
        
        if method == 'ml':
            self._fit_ml(y, X, W, rho_bounds)
        else:
            raise ValueError(f"Unsupported method: {method}")
        
        return self
    
    def _fit_ml(self, y, X, W, rho_bounds):
        """Maximum Likelihood 추정"""
        
        def neg_loglik(rho):
            """음의 로그우도 함수"""
            try:
                # log|I - ρW| 계산
                log_det = np.log(np.linalg.det(np.eye(self.n) - rho * W))
                if not np.isfinite(log_det):
                    return np.inf
            except:
                return np.inf
            
            # Spatial filtering: y* = y - ρWy
            y_star = y - rho * (W @ y)
            
            # OLS on filtered data: β = (X'X)^-1 X'y*
            try:
                XtX_inv = np.linalg.inv(X.T @ X)
                beta = XtX_inv @ X.T @ y_star
            except np.linalg.LinAlgError:
                return np.inf
            
            # Residuals
            e = y_star - X @ beta
            sigma2 = (e.T @ e) / self.n
            
            if sigma2 <= 0:
                return np.inf
            
            # Log-likelihood
            loglik = (-0.5 * self.n * np.log(2 * np.pi) 
                      - 0.5 * self.n * np.log(sigma2) 
                      + log_det 
                      - (e.T @ e) / (2 * sigma2))
            
            return -loglik
        
        # Optimization
        result = minimize(
            neg_loglik, 
            x0=0.0, 
            method='L-BFGS-B', 
            bounds=[rho_bounds]
        )
        
        self.converged = result.success
        if not self.converged:
            warnings.warn("Optimization did not converge.")
        
        # Store results
        self.rho = result.x[0]
        y_star = y - self.rho * (W @ y)
        self.beta = np.linalg.inv(X.T @ X) @ X.T @ y_star
        e = y_star - (X @ self.beta)
        self.sigma2 = (e.T @ e) / self.n
        self.loglik = -result.fun
        
    def predict(self, X, W=None):
        """예측값 계산"""
        if self.beta is None:
            raise ValueError("Model not fitted yet")
        
        X = np.asarray(X)
        
        if W is None:
            # 공간 효과 없이 예측
            return X @ self.beta
        else:
            # 공간 효과 포함 예측 (반복법 필요)
            # y = ρWy + Xβ + ε
            # (I - ρW)y = Xβ + ε
            # y = (I - ρW)^-1 Xβ
            W = np.asarray(W) if not issparse(W) else W.toarray()
            I_rhoW_inv = np.linalg.inv(np.eye(len(X)) - self.rho * W)
            return I_rhoW_inv @ (X @ self.beta)


def main():
    try:
        # Input parsing
        payload = json.load(sys.stdin)
        data = pd.DataFrame(payload.get('data'))
        y_col = payload.get('y_col')
        x_cols = payload.get('x_cols')
        lat_col = payload.get('lat_col')
        lon_col = payload.get('lon_col')
        
        # 공간 가중 행렬 옵션
        w_method = payload.get('w_method', 'knn')
        k_neighbors = payload.get('k_neighbors', 5)
        distance_threshold = payload.get('distance_threshold', 50)
        
        # Validation
        if not all([y_col, x_cols, lat_col, lon_col]):
            raise ValueError("Missing required columns: y_col, x_cols, lat_col, lon_col")
        
        if y_col not in data.columns:
            raise ValueError(f"Column '{y_col}' not found in data")
        if lat_col not in data.columns:
            raise ValueError(f"Column '{lat_col}' not found in data")
        if lon_col not in data.columns:
            raise ValueError(f"Column '{lon_col}' not found in data")
        
        for col in x_cols:
            if col not in data.columns:
                raise ValueError(f"Column '{col}' not found in data")
        
        # Extract data
        y = data[y_col].values
        X = data[x_cols].values
        lat = data[lat_col].values
        lon = data[lon_col].values
        
        # Add intercept
        X = np.column_stack([np.ones(len(y)), X])
        
        # Create spatial weights matrix
        W = create_spatial_weights_from_coords(
            lat, lon, 
            method=w_method, 
            k=k_neighbors, 
            threshold=distance_threshold
        )
        
        # Calculate Moran's I for diagnostics
        moran_i = morans_i(y, W)
        
        # Fit SAR model
        model = SARModel()
        model.fit(y, X, W)
        
        # Model diagnostics
        aic = -2 * model.loglik + 2 * (model.k + 2)  # k parameters + rho + sigma2
        bic = -2 * model.loglik + np.log(model.n) * (model.k + 2)
        
        # Prepare results
        coef_names = ['intercept'] + x_cols
        coefficients = {
            'rho': model.rho,
            **{name: val for name, val in zip(coef_names, model.beta)}
        }
        
        results = {
            "coefficients": coefficients,
            "sigma2": model.sigma2,
            "log_likelihood": model.loglik,
            "aic": aic,
            "bic": bic,
            "n_obs": model.n,
            "converged": model.converged,
            "diagnostics": {
                "morans_i": moran_i,
                "spatial_weights_method": w_method,
                "k_neighbors": k_neighbors if w_method == 'knn' else None,
                "distance_threshold": distance_threshold if w_method == 'threshold' else None
            }
        }
        
        print(json.dumps({'results': results}, default=_to_native_type))
        
    except Exception as e:
        error_msg = str(e)
        print(json.dumps({"error": error_msg}), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()


