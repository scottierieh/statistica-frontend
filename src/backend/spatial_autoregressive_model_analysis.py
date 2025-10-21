
import sys
import json
import numpy as np
import pandas as pd
from scipy.optimize import minimize
from scipy.sparse import issparse
import warnings
from sklearn.neighbors import kneighbors_graph

def _to_native_type(obj):
    if isinstance(obj, np.integer): return int(obj)
    if isinstance(obj, (np.floating, float)):
        if np.isnan(obj) or np.isinf(obj): return None
        return float(obj)
    elif isinstance(obj, np.ndarray): return obj.tolist()
    return obj

class SARModel:
    def __init__(self):
        self.rho = None
        self.beta = None
        self.sigma2 = None
        self.loglik = None
        self.n = None
        self.k = None

    def fit(self, y, X, W, method='ml', rho_bounds=(-0.99, 0.99)):
        y = np.asarray(y).flatten()
        X = np.asarray(X)
        W = np.asarray(W) if not issparse(W) else W.toarray()
        
        self.n = len(y)
        self.k = X.shape[1]
        
        if X.shape[0] != self.n or W.shape[0] != self.n or W.shape[1] != self.n:
            raise ValueError("Input dimensions are incorrect.")
        
        if method == 'ml':
            self._fit_ml(y, X, W, rho_bounds)
        else:
            raise ValueError(f"Unsupported method: {method}")
        
        return self
    
    def _fit_ml(self, y, X, W, rho_bounds):
        def neg_loglik(rho):
            try:
                log_det = np.log(np.linalg.det(np.eye(self.n) - rho * W))
            except:
                return np.inf
            
            y_star = y - rho * (W @ y)
            
            try:
                XtX_inv = np.linalg.inv(X.T @ X)
                beta = XtX_inv @ X.T @ y_star
            except np.linalg.LinAlgError:
                return np.inf
            
            e = y_star - X @ beta
            sigma2 = (e.T @ e) / self.n
            
            if sigma2 <= 0: return np.inf

            loglik = -0.5 * self.n * np.log(2 * np.pi) - 0.5 * self.n * np.log(sigma2) + log_det - (e.T @ e) / (2 * sigma2)
            
            return -loglik

        result = minimize(neg_loglik, x0=0.0, method='L-BFGS-B', bounds=[rho_bounds])
        
        if not result.success:
            warnings.warn("Optimization did not converge.")
        
        self.rho = result.x[0]
        y_star = y - self.rho * (W @ y)
        self.beta = np.linalg.inv(X.T @ X) @ X.T @ y_star
        e = y_star - (X @ self.beta)
        self.sigma2 = (e.T @ e) / self.n
        self.loglik = -result.fun


def create_weights_from_coords(latitudes, longitudes, k=5, normalize=True):
    """
    Creates a spatial weights matrix (W) from latitude and longitude using k-NN.
    """
    coords = np.vstack([latitudes, longitudes]).T
    W = kneighbors_graph(coords, k, mode='connectivity', include_self=False)
    W = W.toarray()
    
    if normalize:
        row_sums = W.sum(axis=1)
        row_sums[row_sums == 0] = 1
        W = W / row_sums[:, np.newaxis]
        
    return W


def main():
    try:
        payload = json.load(sys.stdin)
        data = pd.DataFrame(payload.get('data'))
        y_col = payload.get('y_col')
        x_cols = payload.get('x_cols')
        lat_col = payload.get('lat_col')
        lon_col = payload.get('lon_col')
        
        if not all([y_col, x_cols, lat_col, lon_col]):
             raise ValueError("Missing y_col, x_cols, lat_col, or lon_col")

        y = data[y_col].values
        X = data[x_cols].values
        X = np.column_stack([np.ones(len(y)), X]) # Add intercept

        latitudes = data[lat_col].values
        longitudes = data[lon_col].values
        
        # Create spatial weights matrix from coordinates
        W = create_weights_from_coords(latitudes, longitudes)
        
        model = SARModel()
        model.fit(y, X, W)

        aic = -2 * model.loglik + 2 * (model.k + 2)
        bic = -2 * model.loglik + np.log(model.n) * (model.k + 2)
        
        var_names = ['const'] + x_cols

        results = {
            "coefficients": {
                "rho": model.rho,
                **{var_names[i]: v for i, v in enumerate(model.beta)}
            },
            "sigma2": model.sigma2,
            "log_likelihood": model.loglik,
            "aic": aic,
            "bic": bic,
            "n_obs": model.n
        }
        
        print(json.dumps({'results': results}, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
