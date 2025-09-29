
import sys
import json
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from sklearn import datasets
from sklearn.decomposition import PCA
from sklearn.discriminant_analysis import LinearDiscriminantAnalysis
from sklearn.preprocessing import LabelEncoder
import io
import base64

def main():
    try:
        payload = json.load(sys.stdin)
        
        is_custom_data = 'data' in payload
        if is_custom_data:
            df = pd.DataFrame(payload['data'])
            feature_cols = payload['feature_cols']
            target_col = payload['target_col']
            
            X = df[feature_cols].values
            
            if df[target_col].dtype == 'object':
                le = LabelEncoder()
                y = le.fit_transform(df[target_col])
                target_names = le.classes_.tolist()
            else:
                y = df[target_col].values
                target_names = sorted(list(df[target_col].unique()))

        else:
            # Default to Iris dataset if no custom data
            iris = datasets.load_iris()
            X = iris.data
            y = iris.target
            target_names = iris.target_names

        pca = PCA(n_components=2)
        X_r = pca.fit(X).transform(X)

        lda = LinearDiscriminantAnalysis(n_components=2)
        X_r2 = lda.fit(X, y).transform(X)
        
        pca_explained_variance = pca.explained_variance_ratio_

        # Plot PCA
        fig1, ax1 = plt.subplots()
        colors = ["navy", "turquoise", "darkorange"]
        lw = 2
        for color, i, target_name in zip(colors, range(len(target_names)), target_names):
            ax1.scatter(
                X_r[y == i, 0], X_r[y == i, 1], color=color, alpha=0.8, lw=lw, label=target_name
            )
        ax1.legend(loc="best", shadow=False, scatterpoints=1)
        ax1.set_title("PCA of dataset")
        buf1 = io.BytesIO()
        fig1.savefig(buf1, format='png')
        buf1.seek(0)
        pca_plot_image = base64.b64encode(buf1.read()).decode('utf-8')
        plt.close(fig1)

        # Plot LDA
        fig2, ax2 = plt.subplots()
        for color, i, target_name in zip(colors, range(len(target_names)), target_names):
            ax2.scatter(
                X_r2[y == i, 0], X_r2[y == i, 1], alpha=0.8, color=color, label=target_name
            )
        ax2.legend(loc="best", shadow=False, scatterpoints=1)
        ax2.set_title("LDA of dataset")
        buf2 = io.BytesIO()
        fig2.savefig(buf2, format='png')
        buf2.seek(0)
        lda_plot_image = base64.b64encode(buf2.read()).decode('utf-8')
        plt.close(fig2)

        response = {
            'results': {
                'pca_explained_variance': pca_explained_variance.tolist()
            },
            'plots': {
                'pca': f"data:image/png;base64,{pca_plot_image}",
                'lda': f"data:image/png;base64,{lda_plot_image}",
            }
        }
        
        print(json.dumps(response))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
