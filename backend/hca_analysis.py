import sys
import json
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from scipy.cluster.hierarchy import dendrogram, linkage, fcluster
from scipy.spatial.distance import pdist
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import silhouette_score, calinski_harabasz_score, davies_bouldin_score
from sklearn.decomposition import PCA
import warnings
import io
import base64

warnings.filterwarnings('ignore')

def _to_native_type(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, np.bool_):
        return bool(obj)
    return obj

class HierarchicalClusterAnalysis:
    def __init__(self, data, feature_cols=None, standardize=True):
        self.data = pd.DataFrame(data)
        self.standardize = standardize
        self.feature_cols = feature_cols if feature_cols is not None else self.data.select_dtypes(include=np.number).columns.tolist()
        
        self.cluster_data = self.data[self.feature_cols].copy().dropna()
        
        if self.standardize:
            scaler = StandardScaler()
            self.cluster_data_scaled = pd.DataFrame(scaler.fit_transform(self.cluster_data), columns=self.feature_cols, index=self.cluster_data.index)
        else:
            self.cluster_data_scaled = self.cluster_data.copy()
            
        self.n_samples, self.n_features = self.cluster_data_scaled.shape
        self.results = {}

    def perform_clustering(self, linkage_method='ward', distance_metric='euclidean', n_clusters=None):
        self.linkage_method = linkage_method
        self.distance_metric = distance_metric
        
        if linkage_method == 'ward':
            # Ward linkage requires euclidean distance
            self.linkage_matrix = linkage(self.cluster_data_scaled, method='ward')
        else:
            distances = pdist(self.cluster_data_scaled, metric=distance_metric)
            self.linkage_matrix = linkage(distances, method=linkage_method)
        
        if n_clusters is None:
            n_clusters = self._find_optimal_clusters()
        
        self.n_clusters = n_clusters
        self.cluster_labels = fcluster(self.linkage_matrix, t=n_clusters, criterion='maxclust')
        
        self.results['linkage_method'] = linkage_method
        self.results['distance_metric'] = distance_metric
        self.results['n_clusters'] = n_clusters
        self.results['cluster_labels'] = self.cluster_labels.tolist()
        
    def _find_optimal_clusters(self, max_k=10):
        k_range = range(2, min(max_k + 1, self.n_samples))
        silhouette_scores = []

        for k in k_range:
            labels = fcluster(self.linkage_matrix, k, criterion='maxclust')
            if len(np.unique(labels)) > 1:
                score = silhouette_score(self.cluster_data_scaled, labels)
                silhouette_scores.append(score)
            else:
                silhouette_scores.append(-1) # Invalid score

        if not silhouette_scores:
            return 3 # Default fallback

        best_k = k_range[np.argmax(silhouette_scores)]
        self.results['optimal_k_recommendation'] = best_k
        self.results['validation_scores'] = {'k_range': list(k_range), 'silhouette': silhouette_scores}
        return best_k

    def analyze_clusters(self):
        if self.cluster_labels is None: return

        profiles = {}
        unique_labels = np.unique(self.cluster_labels)
        
        for label in unique_labels:
            mask = (self.cluster_labels == label)
            cluster_data = self.cluster_data[mask]
            profiles[f'Cluster {label}'] = {
                'size': int(mask.sum()),
                'percentage': float(mask.sum() / self.n_samples * 100),
                'centroid': cluster_data.mean().to_dict()
            }
        self.results['profiles'] = profiles

        if len(unique_labels) > 1:
            self.results['final_metrics'] = {
                'silhouette': silhouette_score(self.cluster_data_scaled, self.cluster_labels),
                'calinski_harabasz': calinski_harabasz_score(self.cluster_data_scaled, self.cluster_labels),
                'davies_bouldin': davies_bouldin_score(self.cluster_data_scaled, self.cluster_labels),
            }

    def plot_dendrogram(self):
        plt.figure(figsize=(10, 7))
        plt.title(f'Dendrogram ({self.linkage_method} linkage, {self.distance_metric} metric)')
        dendrogram(self.linkage_matrix, truncate_mode='lastp', p=12, leaf_rotation=90., leaf_font_size=8., show_contracted=True)
        plt.axhline(y=self.linkage_matrix[-(self.n_clusters-1), 2], c='red', ls='--', lw=1)
        plt.xlabel("Cluster Size")
        plt.ylabel("Distance")

        buf = io.BytesIO()
        plt.savefig(buf, format='png', bbox_inches='tight')
        plt.close()
        buf.seek(0)
        return f"data:image/png;base64,{base64.b64encode(buf.read()).decode('utf-8')}"

def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        items = payload.get('items')
        linkage_method = payload.get('linkageMethod', 'ward')
        distance_metric = payload.get('distanceMetric', 'euclidean')
        n_clusters = payload.get('nClusters') # Can be None

        if not data or not items:
            raise ValueError("Missing 'data' or 'items'")

        hca = HierarchicalClusterAnalysis(data=data, feature_cols=items, standardize=True)
        hca.perform_clustering(linkage_method, distance_metric, n_clusters)
        hca.analyze_clusters()
        
        plot_image = hca.plot_dendrogram()

        response = {
            'results': hca.results,
            'plot': plot_image
        }
        
        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()

    