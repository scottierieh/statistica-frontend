
import sys
import json
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.colors import ListedColormap
import io
import base64

from sklearn.datasets import make_circles, make_classification, make_moons
from sklearn.discriminant_analysis import QuadraticDiscriminantAnalysis
from sklearn.ensemble import AdaBoostClassifier, RandomForestClassifier
from sklearn.gaussian_process import GaussianProcessClassifier
from sklearn.gaussian_process.kernels import RBF
from sklearn.inspection import DecisionBoundaryDisplay
from sklearn.model_selection import train_test_split
from sklearn.naive_bayes import GaussianNB
from sklearn.neighbors import KNeighborsClassifier
from sklearn.neural_network import MLPClassifier
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC
from sklearn.tree import DecisionTreeClassifier

def main():
    try:
        payload = json.load(sys.stdin)
        dataset_name = payload.get('dataset', 'moons')

        names = [
            "Nearest Neighbors", "Linear SVM", "RBF SVM", "Gaussian Process",
            "Decision Tree", "Random Forest", "Neural Net", "AdaBoost",
            "Naive Bayes", "QDA",
        ]

        classifiers = [
            KNeighborsClassifier(3),
            SVC(kernel="linear", C=0.025, random_state=42),
            SVC(gamma=2, C=1, random_state=42),
            GaussianProcessClassifier(1.0 * RBF(1.0), random_state=42),
            DecisionTreeClassifier(max_depth=5, random_state=42),
            RandomForestClassifier(max_depth=5, n_estimators=10, max_features=1, random_state=42),
            MLPClassifier(alpha=1, max_iter=1000, random_state=42),
            AdaBoostClassifier(random_state=42),
            GaussianNB(),
            QuadraticDiscriminantAnalysis(),
        ]
        
        X, y = make_classification(
            n_features=2, n_redundant=0, n_informative=2, random_state=1, n_clusters_per_class=1
        )
        rng = np.random.RandomState(2)
        X += 2 * rng.uniform(size=X.shape)
        linearly_separable = (X, y)

        datasets_map = {
            "moons": make_moons(noise=0.3, random_state=0),
            "circles": make_circles(noise=0.2, factor=0.5, random_state=1),
            "linear": linearly_separable,
        }

        X, y = datasets_map.get(dataset_name, datasets_map["moons"])

        X = StandardScaler().fit_transform(X)
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.4, random_state=42
        )

        x_min, x_max = X[:, 0].min() - 0.5, X[:, 0].max() + 0.5
        y_min, y_max = X[:, 1].min() - 0.5, X[:, 1].max() + 0.5
        
        cm = plt.cm.RdBu
        cm_bright = ListedColormap(["#FF0000", "#0000FF"])

        fig = plt.figure(figsize=(len(classifiers) * 3 + 3, 4))
        
        # Plot input data
        ax = plt.subplot(1, len(classifiers) + 1, 1)
        ax.set_title("Input data")
        ax.scatter(X_train[:, 0], X_train[:, 1], c=y_train, cmap=cm_bright, edgecolors="k")
        ax.scatter(X_test[:, 0], X_test[:, 1], c=y_test, cmap=cm_bright, alpha=0.6, edgecolors="k")
        ax.set_xlim(x_min, x_max)
        ax.set_ylim(y_min, y_max)
        ax.set_xticks(())
        ax.set_yticks(())

        scores = {}
        for i, (name, clf) in enumerate(zip(names, classifiers), start=2):
            ax = plt.subplot(1, len(classifiers) + 1, i)
            
            clf = make_pipeline(StandardScaler(), clf)
            clf.fit(X_train, y_train)
            score = clf.score(X_test, y_test)
            scores[name] = score

            DecisionBoundaryDisplay.from_estimator(
                clf, X, cmap=cm, alpha=0.8, ax=ax, eps=0.5
            )

            ax.scatter(X_train[:, 0], X_train[:, 1], c=y_train, cmap=cm_bright, edgecolors="k")
            ax.scatter(X_test[:, 0], X_test[:, 1], c=y_test, cmap=cm_bright, edgecolors="k", alpha=0.6)

            ax.set_xlim(x_min, x_max)
            ax.set_ylim(y_min, y_max)
            ax.set_xticks(())
            ax.set_yticks(())
            ax.set_title(name)
            ax.text(x_max - 0.3, y_min + 0.3, ("%.2f" % score).lstrip("0"), size=15, horizontalalignment="right")

        plt.tight_layout()
        
        buf = io.BytesIO()
        plt.savefig(buf, format='png')
        plt.close(fig)
        buf.seek(0)
        plot_image = base64.b64encode(buf.read()).decode('utf-8')

        response = {
            'results': {
                'scores': scores
            },
            'plot': f"data:image/png;base64,{plot_image}"
        }
        
        print(json.dumps(response))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
