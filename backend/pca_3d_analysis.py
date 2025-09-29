
import sys
import json
import pandas as pd
import numpy as np
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler, LabelEncoder
import plotly.graph_objects as go
import plotly.io as pio

def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        feature_cols = payload.get('feature_cols')
        target_col = payload.get('target_col')

        if not all([data, feature_cols, target_col]):
            raise ValueError("Missing 'data', 'feature_cols', or 'target_col'")

        df = pd.DataFrame(data)

        X = df[feature_cols].values
        
        le = LabelEncoder()
        y = le.fit_transform(df[target_col])
        target_names = le.classes_.tolist()
        
        # Scale features
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)

        # PCA
        pca = PCA(n_components=3)
        X_reduced = pca.fit_transform(X_scaled)

        # Create Plotly 3D Scatter Plot
        fig = go.Figure()
        
        colors = ['#636EFA', '#EF553B', '#00CC96', '#AB63FA', '#FFA15A', '#19D3F3']

        for i, target_name in enumerate(target_names):
            fig.add_trace(go.Scatter3d(
                x=X_reduced[y == i, 0],
                y=X_reduced[y == i, 1],
                z=X_reduced[y == i, 2],
                mode='markers',
                marker=dict(
                    size=5,
                    color=colors[i % len(colors)],
                    opacity=0.8
                ),
                name=str(target_name)
            ))

        fig.update_layout(
            title="First Three PCA Dimensions",
            scene=dict(
                xaxis_title="1st Eigenvector",
                yaxis_title="2nd Eigenvector",
                zaxis_title="3rd Eigenvector"
            ),
            margin=dict(l=0, r=0, b=0, t=40)
        )
        
        plot_json = pio.to_json(fig)
        
        response = {
            'plot': plot_json
        }
        
        print(json.dumps(response))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
