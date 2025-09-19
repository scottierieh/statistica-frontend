
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
    
    pooled_cov_inv = inv(np.cov(X, rowvar=False))
    
    M_stat = 0
    for i in groups:
        group_data = X[y == i]
        n_i = len(group_data)
        if n_i < n_features + 1: continue
        
        cov_i = np.cov(group_data, rowvar=False)
        M_stat += (n_i - 1) * np.log(np.linalg.det(cov_i))

    n_total = len(X)
    pooled_det_log = np.log(np.linalg.det(np.cov(X, rowvar=False)))
    M_stat = (n_total - n_groups) * pooled_det_log - M_stat

    c1 = (2 * n_features**2 + 3 * n_features - 1) / (6 * (n_features + 1) * (n_groups - 1)) * \
         (sum(1 / (len(X[y == i]) - 1) for i in groups) - 1 / (n_total - n_groups))
    
    df1 = 0.5 * n_features * (n_features + 1) * (n_groups - 1)
    
    chi2_stat = M_stat * (1 - c1)
    p_value = chi2.sf(chi2_stat, df1)
    
    return {'statistic': chi2_stat, 'p_value': p_value}


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

        # --- LDA Implementation ---
        n_components = min(n_groups - 1, n_features)
        if n_components == 0:
            raise ValueError("Cannot perform LDA. The number of components must be at least 1.")

        lda = LinearDiscriminantAnalysis(n_components=n_components, store_covariance=True)
        X_lda = lda.fit_transform(X_scaled, y)
        y_pred = lda.predict(X_scaled)
        
        # --- Classification Metrics ---
        accuracy = accuracy_score(y, y_pred)
        conf_matrix = confusion_matrix(y, y_pred).tolist()
        
        # --- Group Statistics ---
        group_stats = {}
        group_covariances = {}
        for i, group in enumerate(groups):
            group_data = X_scaled[y == i]
            group_stats[group] = {
                'mean': group_data.mean(axis=0).tolist(),
                'std': group_data.std(axis=0, ddof=1).tolist(),
                'n': len(group_data)
            }
            group_covariances[group] = np.cov(group_data, rowvar=False).tolist()

        # --- Eigenvalues and Canonical Correlation ---
        eigenvalues = lda.explained_variance_ratio_ * n_components  # Approximate eigenvalues
        canonical_correlations = [np.sqrt(e / (1 + e)) for e in eigenvalues]

        # --- Wilks' Lambda ---
        wilks_lambda = np.prod([1 / (1 + e) for e in eigenvalues])
        
        n = len(X_scaled)
        p = n_features
        m = n - 1 - (p + n_groups) / 2
        s = np.sqrt((p**2 * (n_groups - 1)**2 - 4) / (p**2 + (n_groups - 1)**2 - 5)) if (p**2 + (n_groups - 1)**2 - 5) != 0 else 1
        
        df1 = p * (n_groups - 1)
        df2 = m * s - (p * (n_groups - 1) / 2) + 1
        
        F_approx = ((1 - wilks_lambda**(1/s)) / (wilks_lambda**(1/s))) * (df2 / df1)
        p_value_f = 1 - f_dist.cdf(F_approx, df1, df2)

        # --- Standardized Coefficients & Structure Matrix ---
        std_coeffs = lda.scalings_
        
        # Structure Matrix (Loadings)
        pooled_cov = lda.covariance_
        structure_matrix = pooled_cov @ std_coeffs

        # --- Group Centroids ---
        centroids = lda.transform(lda.means_)
        
        results = {
            'meta': {'groups': groups, 'n_components': n_components, 'predictor_vars': predictor_vars},
            'classification_metrics': {'accuracy': accuracy, 'confusion_matrix': conf_matrix},
            'eigenvalues': eigenvalues.tolist(),
            'canonical_correlations': canonical_correlations,
            'wilks_lambda': {'lambda': wilks_lambda, 'F': F_approx, 'df1': df1, 'df2': df2, 'p_value': p_value_f},
            'standardized_coeffs': std_coeffs.tolist(),
            'structure_matrix': structure_matrix.tolist(),
            'group_stats': group_stats,
            'group_covariances': group_covariances,
            'pooled_covariance': pooled_cov.tolist(),
            'box_m_test': box_m_test(X_scaled, y),
            'group_centroids': centroids.tolist(),
            'lda_transformed_data': X_lda.tolist(),
            'true_labels': y.tolist(),
        }
        
        # --- Plotting ---
        fig, axes = plt.subplots(2, 2, figsize=(15, 12))
        fig.suptitle('Discriminant Analysis Results', fontsize=16)

        # 1. Discriminant Scores Scatterplot
        plot_df = pd.DataFrame(X_lda, columns=[f'LD{i+1}' for i in range(n_components)])
        plot_df['group'] = le.inverse_transform(y)
        sns.scatterplot(data=plot_df, x='LD1', y='LD2' if n_components > 1 else 'LD1', hue='group', ax=axes[0, 0], palette='viridis', s=50, alpha=0.7)
        for i, group in enumerate(groups):
            axes[0, 0].scatter(centroids[i, 0], centroids[i, 1] if n_components > 1 else 0, marker='X', s=150, color='red', label=f'{group} Centroid' if i==0 else '')
        axes[0,0].set_title('Discriminant Function Scatterplot')
        
        # 2. Confusion Matrix
        sns.heatmap(conf_matrix, annot=True, fmt='d', cmap='Blues', xticklabels=groups, yticklabels=groups, ax=axes[0, 1])
        axes[0,1].set_title(f'Classification Accuracy: {accuracy:.2%}')
        axes[0,1].set_xlabel('Predicted')
        axes[0,1].set_ylabel('Actual')

        # 3. Structure Matrix (Loadings)
        sns.heatmap(structure_matrix, annot=True, cmap='viridis', xticklabels=[f'LD{i+1}' for i in range(n_components)], yticklabels=predictor_vars, ax=axes[1, 0])
        axes[1,0].set_title('Structure Matrix (Loadings)')
        
        # 4. Group Means on LD1
        centroid_df = pd.DataFrame({'group': groups, 'LD1_mean': centroids[:,0]})
        sns.barplot(data=centroid_df, x='group', y='LD1_mean', ax=axes[1, 1], palette='viridis')
        axes[1,1].set_title('Group Centroids on First Discriminant Function')
        axes[1,1].set_ylabel('LD1 Score')
        axes[1,1].axhline(0, color='grey', linestyle='--')


        plt.tight_layout(rect=[0, 0, 1, 0.96])
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
