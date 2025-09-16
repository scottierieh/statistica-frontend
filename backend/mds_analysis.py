
import sys
import json
import numpy as np
import pandas as pd
from sklearn.manifold import MDS
from sklearn.metrics import pairwise_distances
from sklearn.preprocessing import StandardScaler
import matplotlib.pyplot as plt
import seaborn as sns
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
    elif isinstance(obj, np.bool_):
        return bool(obj)
    return obj

def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        variables = payload.get('variables')
        n_components = int(payload.get('nComponents', 2))
        metric = payload.get('metric', True)
        distance_metric = payload.get('distanceMetric', 'euclidean')
        group_var = payload.get('groupVar')

        if not data or not variables:
            raise ValueError("Missing 'data' or 'variables'")

        df = pd.DataFrame(data)

        # Select only relevant columns for analysis and drop rows with missing values
        analysis_cols = variables + ([group_var] if group_var else [])
        df_selected = df[analysis_cols].dropna()

        if df_selected.shape[0] < 2:
            raise ValueError("Not enough valid data points for analysis.")

        # Standardize the numeric data
        X = df_selected[variables]
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)

        # Calculate dissimilarity matrix
        dissimilarity_matrix = pairwise_distances(X_scaled, metric=distance_metric)

        # Perform MDS
        mds = MDS(n_components=n_components, metric=metric, dissimilarity='precomputed', random_state=42, normalized_stress='auto')
        coordinates = mds.fit_transform(dissimilarity_matrix)
        stress = mds.stress_

        # --- MDS Plot ---
        plt.figure(figsize=(8, 8))
        plot_hue = df_selected[group_var] if group_var else None
        
        sns.scatterplot(x=coordinates[:, 0], y=coordinates[:, 1], hue=plot_hue, s=80, alpha=0.7, palette='viridis' if group_var else None)
        
        plt.title(f'MDS Plot ({distance_metric.capitalize()} Distance)')
        plt.xlabel('Dimension 1')
        plt.ylabel('Dimension 2')
        plt.grid(True, linestyle='--', alpha=0.6)
        plt.axhline(0, color='grey', lw=1)
        plt.axvline(0, color='grey', lw=1)
        plt.tight_layout()
        
        buf_mds = io.BytesIO()
        plt.savefig(buf_mds, format='png')
        plt.close()
        buf_mds.seek(0)
        plot_image_mds = base64.b64encode(buf_mds.read()).decode('utf-8')

        # --- Shepard Diagram (Stress Plot) ---
        disparities = mds.dissimilarity_matrix_.flatten()
        original_dissimilarities = dissimilarity_matrix.flatten()
        
        # Keep only the upper triangle to avoid duplicates
        indices = np.triu_indices(n=len(X), k=1)
        disparities_upper = dissimilarity_matrix[indices]
        coordinates_dist_upper = pairwise_distances(coordinates)[indices]
        
        plt.figure(figsize=(8, 8))
        sns.scatterplot(x=disparities_upper, y=coordinates_dist_upper, alpha=0.5)
        # Add a y=x line
        min_val = min(np.min(disparities_upper), np.min(coordinates_dist_upper))
        max_val = max(np.max(disparities_upper), np.max(coordinates_dist_upper))
        plt.plot([min_val, max_val], [min_val, max_val], 'r--')
        plt.title('Shepard Diagram (Stress Plot)')
        plt.xlabel('Original Dissimilarities')
        plt.ylabel('Distances in MDS Configuration')
        plt.grid(True, linestyle='--', alpha=0.6)
        plt.tight_layout()

        buf_shepard = io.BytesIO()
        plt.savefig(buf_shepard, format='png')
        plt.close()
        buf_shepard.seek(0)
        plot_image_shepard = base64.b64encode(buf_shepard.read()).decode('utf-8')

        response = {
            'results': {
                'coordinates': coordinates.tolist(),
                'stress': stress,
                'n_components': n_components,
                'metric': metric,
                'distance_metric': distance_metric,
                'n_observations': X_scaled.shape[0]
            },
            'plot': f"data:image/png;base64,{plot_image_mds}",
            'shepard_plot': f"data:image/png;base64,{plot_image_shepard}"
        }
        
        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
