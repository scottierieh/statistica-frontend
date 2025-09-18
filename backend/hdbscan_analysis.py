

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

def plot_hdbscan_results(df, labels, probabilities, profiles, pca_components, explained_variance_ratio):
    """Generates a comprehensive plot for HDBSCAN results."""
    fig = plt.figure(figsize=(15, 12))
    fig.suptitle('HDBSCAN Clustering Results', fontsize=16, fontweight='bold')

    # Define layout using gridspec
    gs = fig.add_gridspec(2, 2)
    ax1 = fig.add_subplot(gs[0, 0])
    ax2 = fig.add_subplot(gs[0, 1])
    ax3 = fig.add_subplot(gs[1, :]) # Snake plot spans the bottom row

    # 1. PCA Scatter Plot
    plot_df = pd.DataFrame(pca_components, columns=['PC1', 'PC2'])
    plot_df['cluster'] = labels
    plot_df['probability'] = probabilities

    unique_labels = sorted(list(set(labels)))
    palette = sns.color_palette("viridis", n_colors=len(unique_labels) - (1 if -1 in unique_labels else 0))
    
    clustered_points = plot_df[plot_df['cluster'] != -1]
    
    sns.scatterplot(
        x=clustered_points['PC1'], 
        y=clustered_points['PC2'], 
        hue=clustered_points['cluster'], 
        size=clustered_points['probability'], 
        sizes=(20, 200), 
        palette=palette, 
        alpha=0.7, 
        ax=ax1,
        legend=False # Remove size legend
    )

    noise_points = plot_df[plot_df['cluster'] == -1]
    if not noise_points.empty:
         sns.scatterplot(x=noise_points['PC1'], y=noise_points['PC2'], color='gray', marker='x', s=50, label='Noise', ax=ax1)

    ax1.set_title('Cluster Visualization (PCA)')
    ax1.set_xlabel(f'Principal Component 1 ({explained_variance_ratio[0]:.1%})')
    ax1.set_ylabel(f'Principal Component 2 ({explained_variance_ratio[1]:.1%})')
    
    # Manually create legend for clusters only
    handles, labels = ax1.get_legend_handles_labels()
    # Filter out the size legend handles if seaborn still adds them
    filtered_handles = [h for h, l in zip(handles, labels) if not l.startswith('probability')]
    filtered_labels = [l for l in labels if not l.startswith('probability')]
    ax1.legend(filtered_handles, filtered_labels, title='Cluster', bbox_to_anchor=(1.05, 1), loc='upper left')

    ax1.grid(True, linestyle='--', alpha=0.6)

    # 2. Cluster Size Distribution
    cluster_sizes = pd.Series(labels).value_counts().sort_index()
    cluster_names = [f'Cluster {i}' if i != -1 else 'Noise' for i in cluster_sizes.index]
    sns.barplot(x=cluster_names, y=cluster_sizes.values, ax=ax2, palette='viridis')
    ax2.set_title('Cluster Size Distribution')
    ax2.set_xlabel('Cluster')
    ax2.set_ylabel('Number of Samples')
    ax2.tick_params(axis='x', rotation=45)

    # 3. Snake Plot
    if profiles:
        centroids_df = pd.DataFrame({name: prof['centroid'] for name, prof in profiles.items() if name != 'Noise'}).T
        if not centroids_df.empty:
            scaled_centroids = (centroids_df - centroids_df.mean()) / centroids_df.std()
            scaled_centroids.T.plot(ax=ax3, marker='o')
            ax3.set_title('Snake Plot of Scaled Centroids')
            ax3.set_xlabel('Features')
            ax3.set_ylabel('Standardized Value (Z-score)')
            ax3.legend(title='Cluster', bbox_to_anchor=(1.05, 1), loc='upper left')
            ax3.grid(True, linestyle='--', alpha=0.5)

    plt.tight_layout(rect=[0, 0.03, 1, 0.95])
    buf = io.BytesIO()
    plt.savefig(buf, format='png')
    plt.close(fig)
    buf.seek(0)
    return base64.b64encode(buf.read()).decode('utf-8')


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
            plot_image = plot_hdbscan_results(df, labels, clusterer.probabilities_, profiles, X_pca, pca.explained_variance_ratio_)

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
