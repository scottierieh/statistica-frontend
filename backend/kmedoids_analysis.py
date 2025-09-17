
import sys
import json
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import silhouette_score, davies_bouldin_score, calinski_harabasz_score, pairwise_distances
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

def kmedoids_pam(X, n_clusters, max_iter=300, random_state=42):
    """
    K-Medoids (PAM) implementation using NumPy.
    """
    rng = np.random.RandomState(random_state)
    
    # 1. Initialize: Select k random points as initial medoids
    n_samples = X.shape[0]
    medoid_indices = rng.choice(n_samples, n_clusters, replace=False)
    
    dist_matrix = pairwise_distances(X, metric='euclidean')
    
    current_cost = float('inf')
    
    for i in range(max_iter):
        # 2. Assignment Step: Assign each point to the nearest medoid
        labels = np.argmin(dist_matrix[:, medoid_indices], axis=1)
        
        # Calculate current cost
        new_cost = np.sum([dist_matrix[j, medoid_indices[labels[j]]] for j in range(n_samples)])
        
        if new_cost >= current_cost:
            break
        
        current_cost = new_cost
        
        # 3. Update Step: Find new medoids
        new_medoid_indices = medoid_indices.copy()
        for cluster_idx in range(n_clusters):
            cluster_points_indices = np.where(labels == cluster_idx)[0]
            if len(cluster_points_indices) == 0:
                continue
            
            # Calculate cost for each point in the cluster to be the medoid
            cluster_dist_matrix = dist_matrix[np.ix_(cluster_points_indices, cluster_points_indices)]
            costs = np.sum(cluster_dist_matrix, axis=1)
            
            # Find the point with the minimum cost
            best_point_in_cluster_idx = np.argmin(costs)
            new_medoid_indices[cluster_idx] = cluster_points_indices[best_point_in_cluster_idx]
            
        # Check for convergence
        if np.array_equal(medoid_indices, new_medoid_indices):
            break
            
        medoid_indices = new_medoid_indices

    final_labels = np.argmin(dist_matrix[:, medoid_indices], axis=1)
    inertia = np.sum([dist_matrix[j, medoid_indices[final_labels[j]]]**2 for j in range(n_samples)])
    
    return final_labels, medoid_indices, inertia


class KMedoidsAnalysis:
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

    def perform_clustering(self, n_clusters, max_iter=300):
        self.n_clusters = n_clusters
        
        # Use custom KMedoids implementation
        labels, medoid_indices, inertia = kmedoids_pam(
            self.cluster_data_scaled.values, 
            n_clusters=n_clusters, 
            max_iter=max_iter, 
            random_state=42
        )
        self.cluster_labels = labels
        self.medoid_indices = medoid_indices
        
        self.results['clustering_summary'] = {
            'n_clusters': n_clusters,
            'inertia': inertia,
            'medoids': self.cluster_data.iloc[medoid_indices].to_dict('records'),
            'medoids_indices': medoid_indices.tolist(),
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
        fig, axes = plt.subplots(1, 2, figsize=(15, 6))
        fig.suptitle('K-Medoids Clustering Results', fontsize=16, fontweight='bold')

        # 1. Cluster Scatter Plot (PCA)
        if self.n_features >= 2:
            pca = PCA(n_components=2)
            pca_data = pca.fit_transform(self.cluster_data_scaled)
            
            sns.scatterplot(x=pca_data[:, 0], y=pca_data[:, 1], hue=self.cluster_labels, 
                            palette='viridis', ax=axes[0], legend='full', s=50, alpha=0.7)
            
            medoids_pca = pca.transform(self.cluster_data_scaled.iloc[self.medoid_indices])
            
            axes[0].scatter(medoids_pca[:, 0], medoids_pca[:, 1], s=200, c='red', marker='X', label='Medoids', edgecolors='black')
            
            axes[0].set_title('Clusters in 2D PCA Space')
            axes[0].set_xlabel(f'Principal Component 1 ({pca.explained_variance_ratio_[0]:.1%})')
            axes[0].set_ylabel(f'Principal Component 2 ({pca.explained_variance_ratio_[1]:.1%})')
            axes[0].legend()
            axes[0].grid(True, alpha=0.3)

        # 2. Radar Chart of Medoids
        if 'profiles' in self.results:
            medoids_df = pd.DataFrame(self.results['clustering_summary']['medoids'])
            if not medoids_df.empty:
                min_vals = self.cluster_data[self.feature_cols].min()
                max_vals = self.cluster_data[self.feature_cols].max()
                range_vals = max_vals - min_vals
                range_vals[range_vals == 0] = 1 # Avoid division by zero
                
                medoids_norm = (medoids_df - min_vals) / range_vals
                
                angles = np.linspace(0, 2 * np.pi, len(self.feature_cols), endpoint=False).tolist()
                angles += angles[:1]
                
                ax_radar = fig.add_subplot(122, polar=True)
                for i, (name, row) in enumerate(medoids_norm.iterrows()):
                    values = row.tolist()
                    values += values[:1]
                    ax_radar.plot(angles, values, label=f'Cluster {i+1}')
                    ax_radar.fill(angles, values, alpha=0.25)
                
                ax_radar.set_xticks(angles[:-1])
                ax_radar.set_xticklabels(self.feature_cols)
                ax_radar.set_title('Cluster Medoids (Normalized)', size=12)
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

        kma = KMedoidsAnalysis(data=data, feature_cols=items)
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
