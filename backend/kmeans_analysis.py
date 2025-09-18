
import sys
import json
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import silhouette_score, davies_bouldin_score, calinski_harabasz_score
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

class KMeansAnalysis:
    def __init__(self, data, feature_cols, standardize=True):
        self.data = pd.DataFrame(data)
        self.feature_cols = feature_cols
        self.cluster_data = self.data[self.feature_cols].copy().dropna()
        
        if standardize:
            scaler = StandardScaler()
            self.cluster_data_scaled = pd.DataFrame(scaler.fit_transform(self.cluster_data), columns=self.feature_cols, index=self.cluster_data.index)
        else:
            self.cluster_data_scaled = self.cluster_data.copy()
            
        self.n_samples, self.n_features = self.cluster_data_scaled.shape
        self.results = {}

    def find_optimal_k(self, max_k=10):
        k_range = range(2, min(max_k + 1, self.n_samples))
        inertias = []
        silhouette_scores = []
        
        for k in k_range:
            kmeans = KMeans(n_clusters=k, init='k-means++', n_init=10, random_state=42)
            kmeans.fit(self.cluster_data_scaled)
            inertias.append(kmeans.inertia_)
            if len(np.unique(kmeans.labels_)) > 1:
                silhouette_scores.append(silhouette_score(self.cluster_data_scaled, kmeans.labels_))
            else:
                silhouette_scores.append(-1)
        
        self.results['optimal_k'] = {
            'k_range': list(k_range),
            'inertias': inertias,
            'silhouette_scores': silhouette_scores
        }
        
        if silhouette_scores:
            best_k_silhouette = k_range[np.argmax(silhouette_scores)]
            self.results['optimal_k']['recommended_k'] = best_k_silhouette
        else:
            self.results['optimal_k']['recommended_k'] = 3
        
        return self.results['optimal_k']

    def perform_clustering(self, n_clusters, init_method='k-means++', n_init=10):
        self.n_clusters = n_clusters
        kmeans = KMeans(n_clusters=n_clusters, init=init_method, n_init=n_init, random_state=42)
        self.cluster_labels = kmeans.fit_predict(self.cluster_data_scaled)
        
        self.results['clustering_summary'] = {
            'n_clusters': n_clusters,
            'inertia': kmeans.inertia_,
            'centroids': kmeans.cluster_centers_.tolist(),
            'labels': self.cluster_labels.tolist()
        }
        
        self.analyze_clusters()
        return self.results

    def analyze_clusters(self):
        profiles = {}
        unique_labels, counts = np.unique(self.cluster_labels, return_counts=True)
        
        for i, label in enumerate(unique_labels):
            mask = (self.cluster_labels == label)
            cluster_data = self.cluster_data[mask]
            profiles[f'Cluster {label + 1}'] = {
                'size': int(counts[i]),
                'percentage': float(counts[i] / self.n_samples * 100),
                'centroid': cluster_data.mean().to_dict(),
            }
        self.results['profiles'] = profiles

        if len(unique_labels) > 1:
            self.results['final_metrics'] = {
                'silhouette': silhouette_score(self.cluster_data_scaled, self.cluster_labels),
                'davies_bouldin': davies_bouldin_score(self.cluster_data_scaled, self.cluster_labels),
                'calinski_harabasz': calinski_harabasz_score(self.cluster_data_scaled, self.cluster_labels),
            }

    def plot_results(self):
        fig, axes = plt.subplots(2, 2, figsize=(15, 12))
        fig.suptitle('K-Means Clustering Results', fontsize=16, fontweight='bold')

        # 1. Elbow Plot
        if 'optimal_k' in self.results:
            opt_k_res = self.results['optimal_k']
            axes[0, 0].plot(opt_k_res['k_range'], opt_k_res['inertias'], 'bo-')
            axes[0, 0].set_xlabel('Number of Clusters (k)')
            axes[0, 0].set_ylabel('Inertia (WCSS)')
            axes[0, 0].set_title('Elbow Method for Optimal k')
            axes[0, 0].grid(True, alpha=0.3)

        # 2. Silhouette Plot
        if 'optimal_k' in self.results and self.results['optimal_k']['silhouette_scores']:
            opt_k_res = self.results['optimal_k']
            sns.barplot(x=opt_k_res['k_range'], y=opt_k_res['silhouette_scores'], ax=axes[0, 1], color='skyblue')
            axes[0, 1].set_xlabel('Number of Clusters (k)')
            axes[0, 1].set_ylabel('Average Silhouette Score')
            axes[0, 1].set_title('Silhouette Scores for Optimal k')
            axes[0, 1].grid(True, alpha=0.3)

        # 3. Cluster Scatter Plot (PCA)
        if self.n_features >= 2:
            pca = PCA(n_components=2)
            pca_data = pca.fit_transform(self.cluster_data_scaled)
            
            sns.scatterplot(x=pca_data[:, 0], y=pca_data[:, 1], hue=self.cluster_labels, 
                            palette='viridis', ax=axes[1, 0], legend='full')
            
            centroids_pca = pca.transform(self.results['clustering_summary']['centroids'])
            axes[1, 0].scatter(centroids_pca[:, 0], centroids_pca[:, 1], s=200, c='red', marker='X', label='Centroids')
            
            axes[1, 0].set_title('Clusters in 2D PCA Space')
            axes[1, 0].set_xlabel(f'Principal Component 1 ({pca.explained_variance_ratio_[0]:.1%})')
            axes[1, 0].set_ylabel(f'Principal Component 2 ({pca.explained_variance_ratio_[1]:.1%})')
            axes[1, 0].legend()
            axes[1, 0].grid(True, alpha=0.3)

        # 4. Radar Chart of Centroids
        if 'profiles' in self.results:
            centroids = pd.DataFrame({name: profile['centroid'] for name, profile in self.results['profiles'].items()}).T
            # Normalize for radar plot
            centroids_norm = (centroids - centroids.min()) / (centroids.max() - centroids.min())
            
            angles = np.linspace(0, 2 * np.pi, len(self.feature_cols), endpoint=False).tolist()
            angles += angles[:1]
            
            ax_radar = fig.add_subplot(224, polar=True)
            for i, (name, row) in enumerate(centroids_norm.iterrows()):
                values = row.tolist()
                values += values[:1]
                ax_radar.plot(angles, values, label=name)
                ax_radar.fill(angles, values, alpha=0.25)
            
            ax_radar.set_xticks(angles[:-1])
            ax_radar.set_xticklabels(self.feature_cols)
            ax_radar.set_title('Cluster Profiles (Normalized)', size=12)
            ax_radar.legend(loc='upper right', bbox_to_anchor=(1.3, 1.1))

        plt.tight_layout(rect=[0, 0.03, 1, 0.95])
        
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
        n_clusters = payload.get('nClusters')

        if not data or not items or n_clusters is None:
            raise ValueError("Missing 'data', 'items', or 'nClusters'")

        kma = KMeansAnalysis(data=data, feature_cols=items)
        kma.find_optimal_k() # Always run this to provide suggestions
        kma.perform_clustering(n_clusters=n_clusters)
        
        plot_image = kma.plot_results()

        response = {
            'results': kma.results,
            'plot': plot_image
        }
        
        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
