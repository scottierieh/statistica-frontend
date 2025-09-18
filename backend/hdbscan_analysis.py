
import sys
import json
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
import hdbscan
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
    return obj

def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        items = payload.get('items')
        min_cluster_size = int(payload.get('min_cluster_size', 5))
        min_samples = payload.get('min_samples')

        if not data or not items:
            raise ValueError("Missing 'data' or 'items'")

        df = pd.DataFrame(data)[items].dropna()
        
        if df.shape[0] == 0:
            raise ValueError("No valid data points for analysis.")

        # Standardize data
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(df)

        # Run HDBSCAN
        clusterer = hdbscan.HDBSCAN(
            min_cluster_size=min_cluster_size, 
            min_samples=min_samples if min_samples else None,
            gen_min_span_tree=True
        )
        clusters = clusterer.fit_predict(X_scaled)

        # Analysis Summary
        labels = clusterer.labels_
        n_clusters_ = len(set(labels)) - (1 if -1 in labels else 0)
        n_noise_ = list(labels).count(-1)

        # Calculate cluster profiles
        profiles = {}
        unique_labels = np.unique(labels)
        
        for label in unique_labels:
            mask = (labels == label)
            cluster_data = df[mask]
            
            cluster_name = f'Cluster {label}' if label != -1 else 'Noise'
            
            profiles[cluster_name] = {
                'size': int(mask.sum()),
                'percentage': float(mask.sum() / len(df) * 100),
                'centroid': cluster_data.mean().to_dict(),
            }

        summary = {
            'n_clusters': n_clusters_,
            'n_noise': n_noise_,
            'n_samples': len(df),
            'min_cluster_size': min_cluster_size,
            'min_samples': min_samples,
            'labels': labels.tolist(),
            'probabilities': clusterer.probabilities_.tolist(),
            'profiles': profiles,
        }

        # --- Plotting ---
        plot_image = None
        if df.shape[1] >= 2:
            pca = PCA(n_components=2)
            X_pca = pca.fit_transform(X_scaled)
            
            plot_df = pd.DataFrame(X_pca, columns=['PC1', 'PC2'])
            plot_df['cluster'] = labels
            plot_df['probability'] = clusterer.probabilities_

            plt.figure(figsize=(10, 8))
            
            # Use a categorical palette, handle noise points separately
            unique_labels = sorted(list(set(labels)))
            palette = sns.color_palette("viridis", n_colors=len(unique_labels) - (1 if -1 in unique_labels else 0))
            
            # Plot non-noise points with size based on probability
            clustered_points = plot_df[plot_df['cluster'] != -1]
            sns.scatterplot(
                x=clustered_points['PC1'],
                y=clustered_points['PC2'],
                hue=clustered_points['cluster'],
                size=clustered_points['probability'],
                sizes=(20, 200),
                palette=palette,
                alpha=0.7,
                legend='full'
            )

            # Plot noise points
            noise_points = plot_df[plot_df['cluster'] == -1]
            if not noise_points.empty:
                 sns.scatterplot(
                    x=noise_points['PC1'],
                    y=noise_points['PC2'],
                    color='gray',
                    marker='x',
                    s=50,
                    label='Noise'
                )

            plt.title('HDBSCAN Clustering (PCA Projection)')
            plt.xlabel(f'Principal Component 1 ({pca.explained_variance_ratio_[0]:.1%})')
            plt.ylabel(f'Principal Component 2 ({pca.explained_variance_ratio_[1]:.1%})')
            plt.legend(title='Cluster', bbox_to_anchor=(1.05, 1), loc='upper left')
            plt.grid(True, linestyle='--', alpha=0.6)
            plt.tight_layout()

            buf = io.BytesIO()
            plt.savefig(buf, format='png')
            plt.close()
            buf.seek(0)
            plot_image = base64.b64encode(buf.read()).decode('utf-8')

        response = {
            'results': summary,
            'plot': f"data:image/png;base64,{plot_image}" if plot_image else None
        }

        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
