import sys
import json
import numpy as np
import pandas as pd
from sklearn.discriminant_analysis import LinearDiscriminantAnalysis
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split, cross_val_score, cross_val_predict
from sklearn.metrics import accuracy_score, confusion_matrix, classification_report, precision_score, recall_score, f1_score
import matplotlib.pyplot as plt
import seaborn as sns
import io
import base64
from scipy.linalg import inv
from scipy.stats import f as f_dist, chi2

# Set seaborn style globally
sns.set_theme(style="darkgrid")
sns.set_context("notebook", font_scale=1.1)

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

def generate_eda_plots(df, hue_var):
    """Generates pair plot and correlation heatmap."""
    plots = {}

    # 1. Pair Plot
    try:
        # Limit to first 5 numeric columns for performance
        numeric_cols = df.select_dtypes(include=np.number).columns
        cols_to_plot = numeric_cols[:5]
        
        pair_df = df[cols_to_plot.tolist() + [hue_var]]

        ax = sns.pairplot(pair_df, hue=hue_var, markers=["o", "s", "D"])
        ax.fig.suptitle("Pair Plot of Key Features by Class", y=1.02, fontsize=12, fontweight='bold')
        plots['pair_plot'] = _fig_to_base64(ax.fig)
    except Exception:
        plots['pair_plot'] = None

    # 2. Correlation Heatmap
    try:
        corr_matrix = df.corr(numeric_only=True)
        fig, ax = plt.subplots(figsize=(8, 6))
        sns.heatmap(corr_matrix, annot=True, cmap='coolwarm', linewidths=0.5, ax=ax)
        ax.set_title("Correlation Heatmap", fontsize=12, fontweight='bold')
        plots['heatmap'] = _fig_to_base64(fig)
    except Exception:
        plots['heatmap'] = None

    return plots


def _fig_to_base64(fig):
    """Converts a matplotlib figure to a base64 encoded string."""
    buf = io.BytesIO()
    fig.savefig(buf, format='png', dpi=100, bbox_inches='tight')
    plt.close(fig)
    buf.seek(0)
    return base64.b64encode(buf.read()).decode('utf-8')


def main():
    try:
        payload = json.load(sys.stdin)
        
        data = payload.get('data')
        group_var = payload.get('groupVar')
        predictor_vars = payload.get('predictorVars')

        if not all([data, group_var, predictor_vars]):
            raise ValueError("Missing 'data', 'groupVar', or 'predictorVars'")

        df = pd.DataFrame(data)
        
        # --- 1. Preprocessing ---
        all_vars = [group_var] + predictor_vars
        df_clean = df[all_vars].dropna().copy()
        
        le = LabelEncoder()
        df_clean[group_var + '_encoded'] = le.fit_transform(df_clean[group_var])
        
        X = df_clean[predictor_vars]
        y_encoded = df_clean[group_var + '_encoded']
        
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)

        groups = le.classes_.tolist()
        
        # --- 2. Exploratory Data Analysis ---
        eda_plots = generate_eda_plots(df_clean, group_var)


        # --- 4. LDA ---
        n_components = min(len(groups) - 1, len(predictor_vars))
        if n_components == 0:
            raise ValueError("Not enough components for LDA (at least 1 required).")

        lda_full = LinearDiscriminantAnalysis(n_components=n_components, store_covariance=True).fit(X_scaled, y_encoded)
        X_lda_full = lda_full.transform(X_scaled)
        
        # --- 5. Classification Evaluation (using Cross-Validation) ---
        # Using cross_val_score for a more robust accuracy estimate
        accuracy_scores = cross_val_score(lda_full, X_scaled, y_encoded, cv=3)
        accuracy = np.mean(accuracy_scores)
        
        # Using cross_val_predict for confusion matrix and detailed metrics
        y_pred = cross_val_predict(lda_full, X_scaled, y_encoded, cv=3)
        conf_matrix = confusion_matrix(y_encoded, y_pred).tolist()
        
        # Additional classification metrics
        precision = precision_score(y_encoded, y_pred, average='weighted', zero_division=0)
        recall = recall_score(y_encoded, y_pred, average='weighted', zero_division=0)
        f1 = f1_score(y_encoded, y_pred, average='weighted', zero_division=0)
        
        # Per-class metrics
        class_report = classification_report(y_encoded, y_pred, target_names=groups, output_dict=True, zero_division=0)
        
        # --- 7. Detailed Statistics ---
        eigenvalues = lda_full.explained_variance_ratio_
        canonical_correlations = np.sqrt(eigenvalues)

        # Wilks' Lambda
        overall_covariance = np.cov(X_scaled, rowvar=False)
        pooled_covariance = lda_full.covariance_
        
        wilks_lambda = np.linalg.det(pooled_covariance) / np.linalg.det(overall_covariance) if np.linalg.det(overall_covariance) != 0 else 0
        
        n = len(X_scaled)
        p = len(predictor_vars)
        g = len(groups)
        
        f_approx = ((1 - wilks_lambda**(1/p)) / (wilks_lambda**(1/p))) * ((n-p-g)/(p*(g-1))) if wilks_lambda > 0 else np.inf
        df1 = p * (g - 1)
        df2 = n - p - g
        p_value_f = 1 - f_dist.cdf(f_approx, df1, df2) if f_approx > 0 and df1 > 0 and df2 > 0 else 1.0

        # --- 1. Group Descriptive Statistics ---
        group_stats = {}
        for i, group in enumerate(groups):
            group_mask = df_clean[group_var + '_encoded'] == i
            group_data = X_scaled[group_mask]
            group_stats[group] = {
                'n': int(group_mask.sum()),
                'means': np.mean(group_data, axis=0).tolist(),
                'stds': np.std(group_data, axis=0, ddof=1).tolist(),
                'predictor_names': predictor_vars
            }

        # --- 2. Box's M Test ---
        # Box's M test for homogeneity of covariance matrices
        try:
            from scipy.stats import chi2
            
            # Calculate pooled covariance
            S_pooled = lda_full.covariance_
            
            # Calculate group covariances
            group_covs = []
            group_ns = []
            for i, group in enumerate(groups):
                group_mask = df_clean[group_var + '_encoded'] == i
                group_data = X_scaled[group_mask]
                if len(group_data) > 1:
                    group_cov = np.cov(group_data.T)
                    group_covs.append(group_cov)
                    group_ns.append(len(group_data))
            
            # Box's M statistic calculation
            if len(group_covs) >= 2:
                n_total = sum(group_ns)
                p = X_scaled.shape[1]
                
                # M statistic
                M = 0
                for i, (cov, n_i) in enumerate(zip(group_covs, group_ns)):
                    if np.linalg.det(cov) > 0 and np.linalg.det(S_pooled) > 0:
                        M += (n_i - 1) * (np.log(np.linalg.det(S_pooled)) - np.log(np.linalg.det(cov)))
                
                # Correction factor
                sum_inv = sum(1/(n_i - 1) for n_i in group_ns)
                C = (2*p**2 + 3*p - 1) / (6*(p+1)*(g-1)) * (sum_inv - 1/(n_total - g))
                
                # Chi-square approximation
                chi2_stat = M * (1 - C)
                df_box = p * (p + 1) * (g - 1) / 2
                p_value_box = 1 - chi2.cdf(chi2_stat, df_box)
                
                box_m_test = {
                    'statistic': chi2_stat,
                    'df': df_box,
                    'p_value': p_value_box,
                    'homogeneous': p_value_box > 0.05
                }
            else:
                box_m_test = {'statistic': None, 'df': None, 'p_value': None, 'homogeneous': None, 'warning': 'Insufficient groups for Box M test'}
        except Exception as e:
            box_m_test = {'statistic': None, 'df': None, 'p_value': None, 'homogeneous': None, 'warning': str(e)}

        # --- 3. Prior Probabilities ---
        priors = lda_full.priors_.tolist()

        # --- 4. Classification Function Coefficients (Fisher's Linear Discriminant) ---
        # These are used for classification: score for each group
        classification_coeffs = {}
        classification_intercepts = {}
        
        # For each group, calculate classification function
        for i, group in enumerate(groups):
            # Classification coefficients: Σ^-1 * μ_i
            group_mean = lda_full.means_[i]
            coef = np.linalg.inv(lda_full.covariance_) @ group_mean
            intercept = -0.5 * group_mean @ np.linalg.inv(lda_full.covariance_) @ group_mean + np.log(lda_full.priors_[i])
            
            classification_coeffs[group] = coef.tolist()
            classification_intercepts[group] = float(intercept)

        # --- 5. Eigenvalues Details Table ---
        eigenvalue_details = []
        cumulative_variance = 0
        for i, (eig, corr) in enumerate(zip(eigenvalues, canonical_correlations)):
            cumulative_variance += eig
            eigenvalue_details.append({
                'function': f'LD{i+1}',
                'eigenvalue': eig,
                'variance_explained': eig,
                'cumulative_variance': cumulative_variance,
                'canonical_correlation': corr
            })

        # --- 6. Pooled Covariance Matrix ---
        pooled_cov_matrix = lda_full.covariance_.tolist()

        # --- 7. Group Means (Centroids in original space) ---
        group_means_original = {}
        for i, group in enumerate(groups):
            group_means_original[group] = lda_full.means_[i].tolist()

        results = {
            'meta': {'groups': groups, 'n_components': n_components, 'predictor_vars': predictor_vars},
            'classification_metrics': {
                'accuracy': accuracy,
                'precision': precision,
                'recall': recall,
                'f1_score': f1,
                'confusion_matrix': conf_matrix,
                'class_report': class_report,
                'true_labels': y_encoded.tolist(),
                'predicted_labels': y_pred.tolist()
            },
            'eigenvalues': eigenvalues.tolist(),
            'eigenvalue_details': eigenvalue_details,
            'canonical_correlations': canonical_correlations.tolist(),
            'wilks_lambda': {'lambda': wilks_lambda, 'F': f_approx, 'df1': df1, 'df2': df2, 'p_value': p_value_f},
            'standardized_coeffs': lda_full.scalings_.tolist(),
            'structure_matrix': (lda_full.scalings_ @ np.diag(lda_full.explained_variance_ratio_)).tolist(),
            'group_centroids': lda_full.transform(lda_full.means_).tolist(),
            'group_means_original': group_means_original,
            'group_stats': group_stats,
            'priors': priors,
            'classification_function_coeffs': classification_coeffs,
            'classification_function_intercepts': classification_intercepts,
            'pooled_covariance_matrix': pooled_cov_matrix,
            'box_m_test': box_m_test,
            'lda_transformed_data': X_lda_full.tolist(),
            'true_labels_full': y_encoded.tolist()
        }

        # --- Plotting LDA Results ---
        # Define consistent line color
        line_color = '#C44E52'
        
        # Create 2x2 subplot for comprehensive visualization
        fig, axes = plt.subplots(2, 2, figsize=(14, 10))
        
        # 1. LDA Discriminant Function Scatterplot
        plot_df = pd.DataFrame(X_lda_full, columns=[f'LD{i+1}' for i in range(n_components)])
        plot_df['group'] = le.inverse_transform(y_encoded)
        
        y_axis = 'LD2' if n_components > 1 else np.zeros(len(plot_df))
        
        sns.scatterplot(data=plot_df, x='LD1', y=y_axis, hue='group', ax=axes[0, 0], palette='viridis', s=50, alpha=0.7)
        
        centroids = lda_full.transform(lda_full.means_)
        for i, group in enumerate(groups):
            centroid_y = centroids[i, 1] if n_components > 1 else 0
            axes[0, 0].scatter(centroids[i, 0], centroid_y, marker='X', s=150, color=line_color, 
                          label=f'{group} Centroid' if i==0 else '', edgecolors='black', linewidths=1.5)
        
        axes[0, 0].set_title('Discriminant Function Scatterplot', fontsize=12, fontweight='bold')
        axes[0, 0].set_xlabel('Discriminant Function 1', fontsize=12)
        axes[0, 0].set_ylabel('Discriminant Function 2' if n_components > 1 else '', fontsize=12)
        if n_components == 1:
            axes[0, 0].get_yaxis().set_visible(False)
        axes[0, 0].legend()
        
        # 2. Confusion Matrix Heatmap
        sns.heatmap(conf_matrix, annot=True, fmt='d', cmap='Blues', ax=axes[0, 1], 
                   xticklabels=groups, yticklabels=groups, cbar_kws={'label': 'Count'})
        axes[0, 1].set_title('Confusion Matrix', fontsize=12, fontweight='bold')
        axes[0, 1].set_xlabel('Predicted Label', fontsize=12)
        axes[0, 1].set_ylabel('True Label', fontsize=12)
        
        # 3. Classification Metrics Bar Plot
        metrics_data = {
            'Accuracy': accuracy,
            'Precision': precision,
            'Recall': recall,
            'F1-Score': f1
        }
        metric_names = list(metrics_data.keys())
        metric_values = list(metrics_data.values())
        
        bars = axes[1, 0].bar(metric_names, metric_values, color='#5B9BD5', alpha=0.7, edgecolor='black')
        axes[1, 0].set_title('Classification Metrics', fontsize=12, fontweight='bold')
        axes[1, 0].set_ylabel('Score', fontsize=12)
        axes[1, 0].set_ylim([0, 1])
        axes[1, 0].axhline(y=0.8, color=line_color, linestyle='--', lw=2, alpha=0.7, label='Target: 0.8')
        
        # Add value labels on bars
        for bar in bars:
            height = bar.get_height()
            axes[1, 0].text(bar.get_x() + bar.get_width()/2., height,
                          f'{height:.3f}', ha='center', va='bottom', fontsize=10)
        axes[1, 0].legend()
        
        # 4. Eigenvalue Scree Plot
        if len(eigenvalues) > 1:
            x_eigen = np.arange(1, len(eigenvalues) + 1)
            axes[1, 1].bar(x_eigen, eigenvalues, color='#5B9BD5', alpha=0.7, edgecolor='black')
            axes[1, 1].plot(x_eigen, eigenvalues, 'o-', color=line_color, linewidth=2, markersize=8)
            axes[1, 1].set_title('Eigenvalue Scree Plot', fontsize=12, fontweight='bold')
            axes[1, 1].set_xlabel('Discriminant Function', fontsize=12)
            axes[1, 1].set_ylabel('Explained Variance Ratio', fontsize=12)
            axes[1, 1].set_xticks(x_eigen)
        else:
            axes[1, 1].text(0.5, 0.5, f'Single Component\nExplained Variance: {eigenvalues[0]:.3f}', 
                          ha='center', va='center', fontsize=12)
            axes[1, 1].set_title('Eigenvalue Information', fontsize=12, fontweight='bold')
        
        plt.tight_layout()
        
        final_response = {
            'results': results,
            'plots': {
                **eda_plots,
                'lda_analysis': _fig_to_base64(fig)
            }
        }

        print(json.dumps(final_response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()