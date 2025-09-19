
import sys
import json
import numpy as np
import pandas as pd
from sklearn.discriminant_analysis import LinearDiscriminantAnalysis
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, confusion_matrix
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.ensemble import RandomForestClassifier
import matplotlib.pyplot as plt
import seaborn as sns
import io
import base64
import warnings

warnings.filterwarnings('ignore')

def _to_native_type(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        if np.isnan(obj):
            return None
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, np.bool_):
        return bool(obj)
    return obj

def create_pair_plot(df, group_var):
    """Generates a pair plot for exploratory data analysis."""
    try:
        g = sns.pairplot(df, hue=group_var, markers=["o", "s", "D"])
        g.fig.suptitle("Feature Pair Plot", y=1.02)
        buf = io.BytesIO()
        plt.savefig(buf, format='png', bbox_inches='tight')
        plt.close(g.fig)
        buf.seek(0)
        return base64.b64encode(buf.read()).decode('utf-8')
    except Exception:
        return None

def create_correlation_heatmap(df):
    """Generates a correlation heatmap."""
    try:
        corr = df.corr(numeric_only=True)
        plt.figure(figsize=(8, 6))
        sns.heatmap(corr, annot=True, cmap='coolwarm', linewidths=0.5)
        plt.title("Correlation Heatmap")
        plt.tight_layout()
        buf = io.BytesIO()
        plt.savefig(buf, format='png')
        plt.close()
        buf.seek(0)
        return base64.b64encode(buf.read()).decode('utf-8')
    except Exception:
        return None


def main():
    try:
        payload = json.load(sys.stdin)
        
        data = payload.get('data')
        group_var = payload.get('groupVar')
        predictor_vars = payload.get('predictorVars')

        if not all([data, group_var, predictor_vars]):
            raise ValueError("Missing 'data', 'groupVar', or 'predictorVars'")

        df = pd.DataFrame(data)
        
        # --- Data Cleaning & EDA ---
        all_vars = [group_var] + predictor_vars
        df_clean = df[all_vars].dropna().copy()
        
        le = LabelEncoder()
        df_clean[group_var + '_encoded'] = le.fit_transform(df_clean[group_var])
        
        X_raw = df_clean[predictor_vars]
        y_encoded = df_clean[group_var + '_encoded'].values
        
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X_raw)

        groups = le.classes_.tolist()
        n_components = min(len(groups) - 1, len(predictor_vars))
        if n_components == 0:
            raise ValueError("Cannot perform LDA. The number of components must be at least 1.")

        # --- EDA Plots ---
        pair_plot_img = create_pair_plot(df_clean[all_vars], group_var)
        heatmap_img = create_correlation_heatmap(X_raw)

        # --- Data Split ---
        try:
             X_train, X_test, y_train, y_test = train_test_split(X_scaled, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded)
        except ValueError:
            # Fallback for small datasets where stratification is not possible
            X_train, X_test, y_train, y_test = train_test_split(X_scaled, y_encoded, test_size=0.2, random_state=42)
        
        # --- LDA Implementation ---
        lda = LinearDiscriminantAnalysis(n_components=n_components)
        X_train_lda = lda.fit_transform(X_train, y_train)
        X_test_lda = lda.transform(X_test)
        
        # --- Classification ---
        classifier = RandomForestClassifier(max_depth=2, random_state=0)
        classifier.fit(X_train_lda, y_train)
        y_pred = classifier.predict(X_test_lda)

        # --- Evaluation ---
        accuracy = accuracy_score(y_test, y_pred)
        conf_matrix = confusion_matrix(y_test, y_pred)

        results = {
            'eda': {
                'pair_plot': f"data:image/png;base64,{pair_plot_img}" if pair_plot_img else None,
                'heatmap': f"data:image/png;base64,{heatmap_img}" if heatmap_img else None
            },
            'lda_results': {
                'explained_variance_ratio': _to_native_type(lda.explained_variance_ratio_),
                'lda_train_transformed': _to_native_type(X_train_lda),
                'lda_test_transformed': _to_native_type(X_test_lda),
                'train_labels': _to_native_type(y_train),
                'test_labels': _to_native_type(y_test)
            },
            'classification_results': {
                'accuracy': _to_native_type(accuracy),
                'confusion_matrix': _to_native_type(conf_matrix)
            },
            'meta': {
                'groups': groups,
                'n_components': n_components
            }
        }
        
        print(json.dumps(results, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
