
import sys
import json
import time
import warnings
from itertools import cycle, islice

import matplotlib.pyplot as plt
import numpy as np

from sklearn import cluster, datasets
from sklearn.preprocessing import StandardScaler

def main():
    try:
        payload = json.load(sys.stdin)
        dataset_name = payload.get("dataset", "noisy_circles")
        params = payload.get("params", {})
        n_samples = 1500

        # Dataset generation
        dataset_map = {
            "noisy_circles": datasets.make_circles(
                n_samples=n_samples, factor=0.5, noise=0.05, random_state=170
            ),
            "noisy_moons": datasets.make_moons(
                n_samples=n_samples, noise=0.05, random_state=170
            ),
            "blobs": datasets.make_blobs(n_samples=n_samples, random_state=170),
            "no_structure": (np.random.RandomState(170).rand(n_samples, 2), None),
        }
        
        X, y = dataset_map.get(dataset_name, dataset_map["noisy_circles"])

        # Normalize dataset for easier parameter selection
        X = StandardScaler().fit_transform(X)

        # Get n_clusters from params, default to 2 if not provided
        n_clusters = params.get("n_clusters", 2)

        # Create cluster objects
        ward = cluster.AgglomerativeClustering(
            n_clusters=n_clusters, linkage="ward"
        )
        complete = cluster.AgglomerativeClustering(
            n_clusters=n_clusters, linkage="complete"
        )
        average = cluster.AgglomerativeClustering(
            n_clusters=n_clusters, linkage="average"
        )
        single = cluster.AgglomerativeClustering(
            n_clusters=n_clusters, linkage="single"
        )

        clustering_algorithms = (
            ("Single Linkage", single),
            ("Average Linkage", average),
            ("Complete Linkage", complete),
            ("Ward Linkage", ward),
        )
        
        fig, axes = plt.subplots(1, len(clustering_algorithms), figsize=(len(clustering_algorithms) * 3.5, 3.5))
        fig.suptitle(f"Hierarchical Clustering on '{dataset_name}' dataset (k={n_clusters})", fontsize=16)

        for plot_num, (name, algorithm) in enumerate(clustering_algorithms):
            ax = axes[plot_num]
            
            with warnings.catch_warnings():
                warnings.filterwarnings(
                    "ignore",
                    message="the number of connected components of the "
                    "connectivity matrix is [0-9]{1,2}"
                    " > 1. Completing it to avoid stopping the tree early.",
                    category=UserWarning,
                )
                algorithm.fit(X)

            if hasattr(algorithm, "labels_"):
                y_pred = algorithm.labels_.astype(int)
            else:
                y_pred = algorithm.predict(X)

            colors = np.array(
                list(
                    islice(
                        cycle(
                            [
                                "#377eb8", "#ff7f00", "#4daf4a",
                                "#f781bf", "#a65628", "#984ea3",
                                "#999999", "#e41a1c", "#dede00",
                            ]
                        ),
                        int(max(y_pred) + 1),
                    )
                )
            )
            ax.scatter(X[:, 0], X[:, 1], s=10, color=colors[y_pred])

            ax.set_title(name, size=12)
            ax.set_xlim(-2.5, 2.5)
            ax.set_ylim(-2.5, 2.5)
            ax.set_xticks(())
            ax.set_yticks(())
            
        plt.tight_layout(rect=[0, 0.03, 1, 0.95])

        import io
        import base64

        buf = io.BytesIO()
        plt.savefig(buf, format='png')
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
