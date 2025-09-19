

import sys
import json
import numpy as np
import pandas as pd
from sklearn.discriminant_analysis import LinearDiscriminantAnalysis
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, confusion_matrix
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
        ax.fig.suptitle("Pair Plot of Key Features by Class", y=1.02)
        plots['pair_plot'] = _fig_to_base64(ax.fig)
    except Exception:
        plots['pair_plot'] = None

    # 2. Correlation Heatmap
    try:
        corr_matrix = df.corr(numeric_only=True)
        fig, ax = plt.subplots(figsize=(8, 6))
        sns.heatmap(corr_matrix, annot=True, cmap='coolwarm', linewidths=0.5, ax=ax)
        ax.set_title("Correlation Heatmap")
        plots['heatmap'] = _fig_to_base64(fig)
    except Exception:
        plots['heatmap'] = None

    return plots


def _fig_to_base64(fig):
    """Converts a matplotlib figure to a base64 encoded string."""
    buf = io.BytesIO()
    fig.savefig(buf, format='png', bbox_inches='tight')
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


        # --- 3. Split data ---
        try:
            X_train, X_test, y_train, y_test = train_test_split(
                X_scaled, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
            )
        except ValueError:
             X_train, X_test, y_train, y_test = train_test_split(
                X_scaled, y_encoded, test_size=0.2, random_state=42
            )


        # --- 4. LDA ---
        n_components = min(len(groups) - 1, len(predictor_vars))
        if n_components == 0:
            raise ValueError("Not enough components for LDA (at least 1 required).")

        lda = LinearDiscriminantAnalysis(n_components=n_components)
        X_train_lda = lda.fit_transform(X_train, y_train)
        X_test_lda = lda.transform(X_test)
        
        # --- 5. Classification ---
        classifier = RandomForestClassifier(max_depth=2, random_state=0)
        classifier.fit(X_train_lda, y_train)
        y_pred = classifier.predict(X_test_lda)
        
        # --- 6. Evaluation ---
        accuracy = accuracy_score(y_test, y_pred)
        conf_matrix = confusion_matrix(y_test, y_pred).tolist()

        # Re-fit LDA on full dataset for descriptive stats
        lda_full = LinearDiscriminantAnalysis(n_components=n_components, store_covariance=True).fit(X_scaled, y_encoded)
        X_lda_full = lda_full.transform(X_scaled)
        
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


        results = {
            'meta': {'groups': groups, 'n_components': n_components, 'predictor_vars': predictor_vars},
            'classification_metrics': {'accuracy': accuracy, 'confusion_matrix': conf_matrix, 'true_labels': y_test.tolist(), 'predicted_labels': y_pred.tolist()},
            'eigenvalues': eigenvalues.tolist(),
            'canonical_correlations': canonical_correlations.tolist(),
            'wilks_lambda': {'lambda': wilks_lambda, 'F': f_approx, 'df1': df1, 'df2': df2, 'p_value': p_value_f},
            'standardized_coeffs': lda_full.scalings_.tolist(),
            'structure_matrix': (lda_full.scalings_ @ np.diag(lda_full.explained_variance_ratio_)).tolist(),
            'group_centroids': lda_full.transform(lda_full.means_).tolist(),
            'lda_transformed_data': X_lda_full.tolist(),
            'true_labels_full': y_encoded.tolist()
        }

        # --- Plotting LDA Results ---
        fig_lda, ax_lda = plt.subplots(figsize=(8, 6))
        
        plot_df = pd.DataFrame(X_lda_full, columns=[f'LD{i+1}' for i in range(n_components)])
        plot_df['group'] = le.inverse_transform(y_encoded)
        
        y_axis = 'LD2' if n_components > 1 else np.zeros(len(plot_df))
        
        sns.scatterplot(data=plot_df, x='LD1', y=y_axis, hue='group', ax=ax_lda, palette='viridis', s=50, alpha=0.7)
        
        centroids = lda_full.transform(lda_full.means_)
        for i, group in enumerate(groups):
            centroid_y = centroids[i, 1] if n_components > 1 else 0
            ax_lda.scatter(centroids[i, 0], centroid_y, marker='X', s=150, color='red', label=f'{group} Centroid' if i==0 else '')
        
        ax_lda.set_title('Discriminant Function Scatterplot')
        ax_lda.set_xlabel('Discriminant Function 1')
        ax_lda.set_ylabel('Discriminant Function 2' if n_components > 1 else '')
        ax_lda.grid(True, alpha=0.3)
        if n_components == 1:
            ax_lda.get_yaxis().set_visible(False)
        ax_lda.legend()
        
        
        final_response = {
            'results': results,
            'plots': {
                **eda_plots,
                'lda_scatter': _fig_to_base64(fig_lda)
            }
        }

        print(json.dumps(final_response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()

