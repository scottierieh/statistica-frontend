
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

        if not data or not variables:
            raise ValueError("Missing 'data' or 'variables'")

        df = pd.DataFrame(data)
        df_selected = df[variables].dropna()

        if df_selected.shape[0] < 2:
            raise ValueError("Not enough valid data points for analysis.")

        # Standardize the data
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(df_selected)

        # Calculate dissimilarity matrix
        dissimilarity_matrix = pairwise_distances(X_scaled, metric=distance_metric)

        # Perform MDS
        mds = MDS(n_components=n_components, metric=metric, dissimilarity='precomputed', random_state=42, normalized_stress='auto')
        coordinates = mds.fit_transform(dissimilarity_matrix)

        stress = mds.stress_
        
        # --- Plotting ---
        plt.figure(figsize=(8, 8))
        sns.scatterplot(x=coordinates[:, 0], y=coordinates[:, 1], s=80, alpha=0.7)
        
        # Optionally add labels if an ID column is provided
        if 'id_col' in payload and payload['id_col'] in df.columns:
            labels = df.loc[df_selected.index][payload['id_col']]
            for i, label in enumerate(labels):
                plt.text(coordinates[i, 0] + 0.01, coordinates[i, 1] + 0.01, label, fontsize=9)
        
        plt.title(f'MDS Plot ({distance_metric.capitalize()} Distance)')
        plt.xlabel('Dimension 1')
        plt.ylabel('Dimension 2')
        plt.grid(True, linestyle='--', alpha=0.6)
        plt.axhline(0, color='grey', lw=1)
        plt.axvline(0, color='grey', lw=1)
        plt.tight_layout()
        
        buf = io.BytesIO()
        plt.savefig(buf, format='png')
        plt.close()
        buf.seek(0)
        plot_image = base64.b64encode(buf.read()).decode('utf-8')

        response = {
            'results': {
                'coordinates': coordinates.tolist(),
                'stress': stress,
                'n_components': n_components,
                'metric': metric,
                'distance_metric': distance_metric,
                'n_observations': X_scaled.shape[0]
            },
            'plot': f"data:image/png;base64,{plot_image}"
        }
        
        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
