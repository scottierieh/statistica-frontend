
import sys
import json
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from scipy.cluster.hierarchy import dendrogram, linkage, fcluster
from scipy.spatial.distance import pdist, squareform
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
        if np.isnan(obj):
            return None
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
        
        if linkage_method == 'ward' and distance_metric != 'euclidean':
            warnings.warn("Ward linkage requires euclidean distance. Overriding distance_metric to 'euclidean'.")
            self.distance_metric = 'euclidean'
            distances = pdist(self.cluster_data_scaled, metric='euclidean')
            self.linkage_matrix = linkage(distances, method='ward')
        elif linkage_method == 'ward':
            distances = pdist(self.cluster_data_scaled, metric='euclidean')
            self.linkage_matrix = linkage(distances, method='ward')
        else:
            distances = pdist(self.cluster_data_scaled, metric=self.distance_metric)
            self.linkage_matrix = linkage(distances, method=linkage_method)
        
        if n_clusters is None:
            recommendations = self._find_optimal_clusters()
            n_clusters = recommendations.get('silhouette', 3) # Default to 3 if silhouette fails
        
        self.n_clusters = n_clusters
        self.cluster_labels = fcluster(self.linkage_matrix, t=n_clusters, criterion='maxclust')
        
        self.results['linkage_method'] = linkage_method
        self.results['distance_metric'] = self.distance_metric
        self.results['n_clusters'] = n_clusters
        self.results['cluster_labels'] = self.cluster_labels.tolist()
        
    def _find_optimal_clusters(self, max_k=10):
        k_range = range(2, min(max_k + 1, self.n_samples - 1))
        silhouette_scores = []
        calinski_scores = []
        davies_bouldin_scores = []

        for k in k_range:
            labels = fcluster(self.linkage_matrix, k, criterion='maxclust')
            if len(np.unique(labels)) > 1:
                silhouette_scores.append(silhouette_score(self.cluster_data_scaled, labels))
                calinski_scores.append(calinski_harabasz_score(self.cluster_data_scaled, labels))
                davies_bouldin_scores.append(davies_bouldin_score(self.cluster_data_scaled, labels))
            else:
                silhouette_scores.append(-1)
                calinski_scores.append(0)
                davies_bouldin_scores.append(np.inf)
        
        recommendations = {}
        if silhouette_scores:
            recommendations['silhouette'] = k_range[np.argmax(silhouette_scores)]
        if calinski_scores:
            recommendations['calinski_harabasz'] = k_range[np.argmax(calinski_scores)]
        if davies_bouldin_scores:
            recommendations['davies_bouldin'] = k_range[np.argmin(davies_bouldin_scores)]

        self.results['optimal_k_recommendation'] = recommendations
        self.results['validation_scores'] = {'k_range': list(k_range), 'silhouette': silhouette_scores}
        return recommendations

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
                'centroid': cluster_data.mean().to_dict(),
                'std': cluster_data.std().to_dict(),
                'min': cluster_data.min().to_dict(),
                'max': cluster_data.max().to_dict(),
            }
        self.results['profiles'] = profiles

        if len(unique_labels) > 1:
            self.results['final_metrics'] = {
                'silhouette': silhouette_score(self.cluster_data_scaled, self.cluster_labels),
                'calinski_harabasz': calinski_harabasz_score(self.cluster_data_scaled, self.cluster_labels),
                'davies_bouldin': davies_bouldin_score(self.cluster_data_scaled, self.cluster_labels),
            }

    def stability_analysis(self, n_bootstrap=50, sample_ratio=0.8):
        stability_scores = []
        for _ in range(n_bootstrap):
            sample_indices = np.random.choice(self.n_samples, int(self.n_samples * sample_ratio), replace=True)
            bootstrap_data = self.cluster_data_scaled.iloc[sample_indices]
            
            if self.linkage_method == 'ward':
                bootstrap_linkage = linkage(bootstrap_data.values, method='ward')
            else:
                bootstrap_distances = pdist(bootstrap_data.values, metric=self.distance_metric)
                bootstrap_linkage = linkage(bootstrap_distances, method=self.linkage_method)

            bootstrap_labels = fcluster(bootstrap_linkage, self.n_clusters, criterion='maxclust')
            
            if len(np.unique(bootstrap_labels)) > 1:
                stability_scores.append(silhouette_score(bootstrap_data, bootstrap_labels))
        
        if stability_scores:
            mean_stability = np.mean(stability_scores)
            std_stability = np.std(stability_scores)
            self.results['stability'] = {
                'mean': mean_stability,
                'std': std_stability
            }

    def plot_results(self):
        fig = plt.figure(figsize=(15, 18))
        gs = fig.add_gridspec(4, 2)

        # 1. Dendrogram
        ax1 = fig.add_subplot(gs[0, :])
        cut_height = 0
        if self.n_clusters > 1 and len(self.linkage_matrix) >= self.n_clusters -1 :
            cut_height = self.linkage_matrix[-(self.n_clusters - 1), 2]
        dendrogram(self.linkage_matrix, ax=ax1, color_threshold=cut_height, above_threshold_color='gray')
        ax1.axhline(y=cut_height, c='red', linestyle='--', label=f'Cut for {self.n_clusters} clusters')
        ax1.set_title('Hierarchical Clustering Dendrogram', fontsize=14, fontweight='bold')
        ax1.set_xlabel('Sample Index')
        ax1.set_ylabel('Distance')
        ax1.legend()

        # 2. Silhouette Plot
        ax2 = fig.add_subplot(gs[1, 0])
        if self.results.get('validation_scores'):
            scores = self.results['validation_scores']
            ax2.plot(scores['k_range'], scores['silhouette'], 'bo-', label='Silhouette Score')
            if self.results.get('optimal_k_recommendation', {}).get('silhouette'):
                best_k_sil = self.results['optimal_k_recommendation']['silhouette']
                best_score_sil = scores['silhouette'][scores['k_range'].index(best_k_sil)]
                ax2.plot(best_k_sil, best_score_sil, 'ro', markersize=10, label=f'Optimal: {best_k_sil}')
            ax2.set_title('Silhouette Score by Number of Clusters')
            ax2.set_xlabel('Number of Clusters')
            ax2.set_ylabel('Silhouette Score')
            ax2.legend()
            ax2.grid(True, alpha=0.3)

        # 3. PCA Plot
        ax3 = fig.add_subplot(gs[1, 1])
        if self.n_features > 1:
            pca = PCA(n_components=2)
            pca_data = pca.fit_transform(self.cluster_data_scaled)
            sns.scatterplot(x=pca_data[:, 0], y=pca_data[:, 1], hue=self.cluster_labels, palette='viridis', ax=ax3, legend='full')
            ax3.set_title('Clusters in PCA Space')
            ax3.set_xlabel(f'PC1 ({pca.explained_variance_ratio_[0]:.1%})')
            ax3.set_ylabel(f'PC2 ({pca.explained_variance_ratio_[1]:.1%})')
            ax3.legend(title='Cluster')
            ax3.grid(True, alpha=0.3)

        # 4. Cluster Size Distribution
        ax4 = fig.add_subplot(gs[2, 0])
        cluster_sizes = pd.Series(self.cluster_labels).value_counts().sort_index()
        sns.barplot(x=cluster_sizes.index, y=cluster_sizes.values, ax=ax4, palette='viridis')
        ax4.set_title('Cluster Size Distribution')
        ax4.set_xlabel('Cluster')
        ax4.set_ylabel('Number of Samples')

        # 5. Centroid Heatmap
        ax5 = fig.add_subplot(gs[2, 1])
        if 'profiles' in self.results:
            centroids_scaled = []
            cluster_names = []
            for name, profile in sorted(self.results['profiles'].items()):
                # Recreate scaled centroids for comparison
                scaled_center = self.cluster_data_scaled[self.cluster_labels == int(name.split(' ')[1])].mean().values
                centroids_scaled.append(scaled_center)
                cluster_names.append(name)

            if centroids_scaled:
                centroid_df = pd.DataFrame(centroids_scaled, columns=self.feature_cols, index=cluster_names)
                sns.heatmap(centroid_df, annot=True, cmap='viridis', ax=ax5)
                ax5.set_title('Scaled Centroid Heatmap')
                ax5.tick_params(axis='x', rotation=45)
        
        # 6. Snake Plot
        ax6 = fig.add_subplot(gs[3, :])
        if 'profiles' in self.results and centroids_scaled:
            centroid_df_norm = (centroid_df - centroid_df.min()) / (centroid_df.max() - centroid_df.min())
            centroid_df_norm.T.plot(ax=ax6)
            ax6.set_title('Snake Plot of Scaled Centroids')
            ax6.set_xlabel('Features')
            ax6.set_ylabel('Normalized Value')
            ax6.legend(title='Cluster')
            ax6.grid(True, linestyle='--', alpha=0.5)


        plt.tight_layout()
        
        buf = io.BytesIO()
        plt.savefig(buf, format='png', bbox_inches='tight')
        plt.close(fig)
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
        hca.stability_analysis()
        
        plot_image = hca.plot_results()

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
