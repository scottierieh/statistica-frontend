
import sys
import json
import numpy as np
import pandas as pd
import matplotlib as mpl
from matplotlib import colors
import matplotlib.pyplot as plt
import io
import base64

from sklearn.discriminant_analysis import (
    LinearDiscriminantAnalysis,
    QuadraticDiscriminantAnalysis,
)
from sklearn.inspection import DecisionBoundaryDisplay
from sklearn.preprocessing import LabelEncoder

def make_data(n_samples, n_features, cov_class_1, cov_class_2, seed=0):
    rng = np.random.RandomState(seed)
    X = np.concatenate(
        [
            rng.randn(n_samples, n_features) @ cov_class_1,
            rng.randn(n_samples, n_features) @ cov_class_2 + np.array([1, 1]),
        ]
    )
    y = np.concatenate([np.zeros(n_samples), np.ones(n_samples)])
    return X, y

def plot_ellipse(mean, cov, color, ax):
    v, w = np.linalg.eigh(cov)
    u = w[0] / np.linalg.norm(w[0])
    angle = np.arctan(u[1] / u[0])
    angle = 180 * angle / np.pi
    ell = mpl.patches.Ellipse(
        mean,
        2 * v[0] ** 0.5,
        2 * v[1] ** 0.5,
        angle=180 + angle,
        facecolor=color,
        edgecolor="black",
        linewidth=2,
    )
    ell.set_clip_box(ax.bbox)
    ell.set_alpha(0.4)
    ax.add_artist(ell)

def plot_result(estimator, X, y, ax):
    cmap = colors.ListedColormap(["tab:red", "tab:blue"])
    DecisionBoundaryDisplay.from_estimator(
        estimator,
        X,
        response_method="predict_proba",
        plot_method="pcolormesh",
        ax=ax,
        cmap="RdBu",
        alpha=0.3,
    )
    DecisionBoundaryDisplay.from_estimator(
        estimator,
        X,
        response_method="predict_proba",
        plot_method="contour",
        ax=ax,
        alpha=1.0,
        levels=[0.5],
    )
    y_pred = estimator.predict(X)
    X_right, y_right = X[y == y_pred], y[y == y_pred]
    X_wrong, y_wrong = X[y != y_pred], y[y != y_pred]
    ax.scatter(X_right[:, 0], X_right[:, 1], c=y_right, s=20, cmap=cmap, alpha=0.5)
    ax.scatter(
        X_wrong[:, 0],
        X_wrong[:, 1],
        c=y_wrong,
        s=30,
        cmap=cmap,
        alpha=0.9,
        marker="x",
    )
    ax.scatter(
        estimator.means_[:, 0],
        estimator.means_[:, 1],
        c="yellow",
        s=200,
        marker="*",
        edgecolor="black",
    )

    if isinstance(estimator, LinearDiscriminantAnalysis):
        covariance = [estimator.covariance_] * 2
    else:
        covariance = estimator.covariance_
    plot_ellipse(estimator.means_[0], covariance[0], "tab:red", ax)
    plot_ellipse(estimator.means_[1], covariance[1], "tab:blue", ax)

    ax.set_box_aspect(1)
    ax.spines["top"].set_visible(False)
    ax.spines["bottom"].set_visible(False)
    ax.spines["left"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.set(xticks=[], yticks=[])

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
            else:
                y = df[target_col].values
            
            datasets = [ (X, y, f"Custom Data: {feature_cols[0]} vs {feature_cols[1]}") ]

        else:
            dataset_name = payload.get("dataset", "isotropic")
            covariance_iso = np.array([[1, 0], [0, 1]])
            X_iso, y_iso = make_data(1000, 2, covariance_iso, covariance_iso, 0)
            
            covariance_shared = np.array([[0.0, -0.23], [0.83, 0.23]])
            X_shared, y_shared = make_data(300, 2, covariance_shared, covariance_shared, 0)
            
            cov_class_1 = np.array([[0.0, -1.0], [2.5, 0.7]]) * 2.0
            cov_class_2 = cov_class_1.T
            X_diff, y_diff = make_data(300, 2, cov_class_1, cov_class_2, 0)
            
            dataset_map = {
                "isotropic": (X_iso, y_iso, "Data with fixed and spherical covariance"),
                "shared": (X_shared, y_shared, "Data with fixed covariance"),
                "different": (X_diff, y_diff, "Data with varying covariances"),
            }
            datasets = [dataset_map.get(dataset_name, dataset_map["isotropic"])]

        # Plotting
        num_datasets = len(datasets)
        fig, axs = plt.subplots(nrows=num_datasets, ncols=2, sharex="row", sharey="row", figsize=(8, 4 * num_datasets), squeeze=False)

        lda = LinearDiscriminantAnalysis(solver="svd", store_covariance=True)
        qda = QuadraticDiscriminantAnalysis(store_covariance=True)

        for i, (X, y, title) in enumerate(datasets):
            lda.fit(X, y)
            plot_result(lda, X, y, axs[i, 0])
            qda.fit(X, y)
            plot_result(qda, X, y, axs[i, 1])
            axs[i, 0].set_ylabel(title)

        axs[0, 0].set_title("Linear Discriminant Analysis")
        axs[0, 1].set_title("Quadratic Discriminant Analysis")
        
        suptitle = "Linear Discriminant Analysis vs Quadratic Discriminant Analysis"
        if not is_custom_data:
            suptitle += f" on '{payload.get('dataset')}' dataset"
            
        fig.suptitle(suptitle, y=1.0 if num_datasets == 1 else 0.94, fontsize=15)
        
        buf = io.BytesIO()
        plt.savefig(buf, format='png', bbox_inches='tight')
        plt.close(fig)
        buf.seek(0)
        plot_image = base64.b64encode(buf.read()).decode('utf-8')

        response = {
            'plot': plot_image
        }
        
        print(json.dumps(response))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
