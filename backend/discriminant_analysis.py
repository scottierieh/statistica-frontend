

import sys
import json
import numpy as np
import pandas as pd
from sklearn.discriminant_analysis import LinearDiscriminantAnalysis
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import confusion_matrix, accuracy_score
import matplotlib.pyplot as plt
import seaborn as sns
import io
import base64
from scipy.linalg import inv
from scipy.stats import f as f_dist, chi2

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

def box_m_test(X, y):
    groups = np.unique(y)
    n_groups = len(groups)
    n_features = X.shape[1]
    
    # Check if any group has fewer samples than features, which makes covariance matrix singular
    for i in groups:
        if len(X[y == i]) <= n_features:
            return {'statistic': np.nan, 'p_value': np.nan, 'warning': f"Group {i} has too few samples to compute a valid covariance matrix."}

    try:
        pooled_cov = np.cov(X, rowvar=False)
        if np.linalg.det(pooled_cov) == 0:
             return {'statistic': np.nan, 'p_value': np.nan, 'warning': "Pooled covariance matrix is singular."}
             
        M_stat = 0
        df_sum = 0
        for i in groups:
            group_data = X[y == i]
            n_i = len(group_data)
            df_i = n_i - 1
            df_sum += df_i
            
            cov_i = np.cov(group_data, rowvar=False)
            det_cov_i = np.linalg.det(cov_i)

            if det_cov_i <= 0:
                 return {'statistic': np.nan, 'p_value': np.nan, 'warning': f"Covariance matrix for group {i} is singular."}
            
            M_stat += df_i * np.log(det_cov_i)

        M_stat = df_sum * np.log(np.linalg.det(pooled_cov)) - M_stat

        c1_num = (2 * n_features**2 + 3 * n_features - 1)
        c1_den = 6 * (n_groups - 1) * (n_features + 1)
        c1_sum_term = np.sum(1.0 / (len(X[y == i]) - 1) for i in groups) - (1.0 / df_sum)
        c1 = c1_num / c1_den * c1_sum_term

        df1 = 0.5 * n_features * (n_features + 1) * (n_groups - 1)
        
        chi2_stat = M_stat * (1 - c1)
        p_value = chi2.sf(chi2_stat, df1)
        
        return {'statistic': chi2_stat, 'p_value': p_value}

    except np.linalg.LinAlgError:
         return {'statistic': np.nan, 'p_value': np.nan, 'warning': "A linear algebra error occurred, likely due to singular covariance matrices."}


def main():
    try:
        payload = json.load(sys.stdin)
        
        data = payload.get('data')
        group_var = payload.get('groupVar')
        predictor_vars = payload.get('predictorVars')

        if not all([data, group_var, predictor_vars]):
            raise ValueError("Missing 'data', 'groupVar', or 'predictorVars'")

        df = pd.DataFrame(data)
        
        all_vars = [group_var] + predictor_vars
        df_clean = df[all_vars].dropna().copy()
        
        le = LabelEncoder()
        df_clean[group_var + '_encoded'] = le.fit_transform(df_clean[group_var])
        
        X = df_clean[predictor_vars].values
        y = df_clean[group_var + '_encoded'].values
        
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)

        groups = le.classes_.tolist()
        n_groups = len(groups)
        n_features = X_scaled.shape[1]
        
        if n_groups <= 1:
            raise ValueError("The grouping variable must have at least 2 distinct groups.")


        # --- LDA Implementation ---
        n_components = min(n_groups - 1, n_features)
        if n_components == 0:
            raise ValueError("Cannot perform LDA. The number of components must be at least 1.")

        lda = LinearDiscriminantAnalysis(n_components=n_components, store_covariance=True)
        
        try:
             X_lda = lda.fit_transform(X_scaled, y)
             y_pred = lda.predict(X_scaled)
        except Exception as e:
            raise ValueError(f"Failed to fit LDA model. This can happen with very small group sizes. Original error: {e}")

        
        # --- Classification Metrics ---
        accuracy = accuracy_score(y, y_pred)
        conf_matrix = confusion_matrix(y, y_pred).tolist()
        
        # --- Group Statistics ---
        group_stats = {}
        group_covariances = {}
        for i, group_name in enumerate(groups):
            group_data = X_scaled[y == i]
            group_stats[group_name] = {
                'mean': group_data.mean(axis=0).tolist(),
                'std': group_data.std(axis=0, ddof=1).tolist(),
                'n': len(group_data)
            }
            if len(group_data) > n_features:
                 group_covariances[group_name] = np.cov(group_data, rowvar=False).tolist()
            else:
                 group_covariances[group_name] = None


        # --- Eigenvalues and Canonical Correlation ---
        eigenvalues = lda.explained_variance_ratio_ * n_components  # Approximate eigenvalues
        canonical_correlations = [np.sqrt(e / (1 + e)) if (1 + e) > 0 else 0 for e in eigenvalues]

        # --- Wilks' Lambda ---
        wilks_lambda = np.prod([1 / (1 + e) for e in eigenvalues])
        
        n = len(X_scaled)
        p = n_features
        m = n - 1 - (p + n_groups) / 2
        s = 1
        if (p**2 + (n_groups-1)**2 - 5) > 0:
             s = np.sqrt((p**2 * (n_groups - 1)**2 - 4) / (p**2 + (n_groups - 1)**2 - 5))
        
        df1 = p * (n_groups - 1)
        df2 = m * s - (p * (n_groups - 1) / 2) + 1 if (m * s - (p * (n_groups - 1) / 2) + 1) > 0 else 1
        
        F_approx = 0
        if wilks_lambda > 0 and s > 0 and df1 > 0 and df2 > 0:
             F_approx = ((1 - wilks_lambda**(1/s)) / (wilks_lambda**(1/s))) * (df2 / df1)
        p_value_f = 1 - f_dist.cdf(F_approx, df1, df2) if F_approx > 0 else 1.0


        # --- Standardized Coefficients & Structure Matrix ---
        std_coeffs = lda.scalings_
        
        # Structure Matrix (Loadings)
        pooled_cov = lda.covariance_
        structure_matrix = pooled_cov @ std_coeffs

        # --- Group Centroids ---
        centroids = lda.transform(lda.means_)
        
        # --- Classification Functions ---
        classification_coeffs = {str(cls): lda.coef_[i] for i, cls in enumerate(le.classes_)}
        classification_intercepts = {str(cls): lda.intercept_[i] for i, cls in enumerate(le.classes_)}

        
        results = {
            'meta': {'groups': groups, 'n_components': n_components, 'predictor_vars': predictor_vars},
            'classification_metrics': {'accuracy': accuracy, 'confusion_matrix': conf_matrix},
            'eigenvalues': eigenvalues.tolist(),
            'canonical_correlations': canonical_correlations,
            'wilks_lambda': {'lambda': wilks_lambda, 'F': F_approx, 'df1': df1, 'df2': df2, 'p_value': p_value_f},
            'standardized_coeffs': std_coeffs.tolist(),
            'structure_matrix': structure_matrix.tolist(),
            'classification_function_coeffs': classification_coeffs,
            'classification_function_intercepts': classification_intercepts,
            'group_stats': group_stats,
            'group_covariances': group_covariances,
            'pooled_covariance': pooled_cov.tolist(),
            'box_m_test': box_m_test(X_scaled, y),
            'group_centroids': centroids.tolist(),
            'lda_transformed_data': X_lda.tolist(),
            'true_labels': y.tolist(),
        }
        
        # --- Plotting ---
        fig, axes = plt.subplots(1, 1, figsize=(8, 6))
        
        plot_df = pd.DataFrame(X_lda, columns=[f'LD{i+1}' for i in range(n_components)])
        plot_df['group'] = le.inverse_transform(y)
        sns.scatterplot(data=plot_df, x='LD1', y='LD2' if n_components > 1 else np.zeros(len(plot_df)), hue='group', ax=axes, palette='viridis', s=50, alpha=0.7)
        for i, group in enumerate(groups):
            axes.scatter(centroids[i, 0], centroids[i, 1] if n_components > 1 else 0, marker='X', s=150, color='red', label=f'{group} Centroid' if i==0 else '')
        axes.set_title('Discriminant Function Scatterplot')
        axes.set_xlabel('Discriminant Function 1')
        axes.set_ylabel('Discriminant Function 2' if n_components > 1 else '')
        axes.grid(True, alpha=0.3)
        if n_components == 1:
            axes.get_yaxis().set_visible(False)
        
        plt.tight_layout()
        buf = io.BytesIO()
        plt.savefig(buf, format='png')
        plt.close(fig)
        
        final_response = {
            'results': results,
            'plot': f"data:image/png;base64,{base64.b64encode(buf.read()).decode('utf-8')}"
        }

        print(json.dumps(final_response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()

