
import sys
import json
import pandas as pd
import numpy as np
import networkx as nx
from networkx.algorithms import community
import matplotlib.pyplot as plt
import io
import base64
import warnings

warnings.filterwarnings('ignore')

def _to_native_type(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, (float, np.floating)):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    return obj

def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        source_col = payload.get('sourceCol')
        target_col = payload.get('targetCol')
        weight_col = payload.get('weightCol')
        is_directed = payload.get('isDirected', False)

        if not all([data, source_col, target_col]):
            raise ValueError("Missing 'data', 'sourceCol', or 'targetCol'")

        df = pd.DataFrame(data)

        # --- Graph Creation ---
        if is_directed:
            G = nx.from_pandas_edgelist(df, source=source_col, target=target_col, edge_attr=weight_col, create_using=nx.DiGraph())
        else:
            G = nx.from_pandas_edgelist(df, source=source_col, target=target_col, edge_attr=weight_col)

        # --- Basic Metrics ---
        n_nodes = G.number_of_nodes()
        n_edges = G.number_of_edges()
        density = nx.density(G)
        
        # --- Centrality Measures ---
        degree_centrality = nx.degree_centrality(G)
        betweenness_centrality = nx.betweenness_centrality(G, weight=weight_col)
        closeness_centrality = nx.closeness_centrality(G, distance=weight_col)

        # --- Top Nodes ---
        top_degree = sorted(degree_centrality.items(), key=lambda x: x[1], reverse=True)[:5]
        top_betweenness = sorted(betweenness_centrality.items(), key=lambda x: x[1], reverse=True)[:5]
        top_closeness = sorted(closeness_centrality.items(), key=lambda x: x[1], reverse=True)[:5]

        # --- Community Detection (Louvain) ---
        communities = []
        if not is_directed:
             # Louvain community detection works best on undirected graphs
            try:
                detected_communities = community.greedy_modularity_communities(G, weight=weight_col)
                communities = [list(c) for c in detected_communities]
            except Exception as e:
                # Fallback or log error
                communities = []
                
        # --- Plotting ---
        plt.figure(figsize=(12, 12))
        pos = nx.spring_layout(G, k=0.5, iterations=50)

        node_sizes = [v * 5000 + 100 for v in degree_centrality.values()]

        nx.draw_networkx_nodes(G, pos, node_size=node_sizes, node_color=list(degree_centrality.values()), cmap=plt.cm.viridis, alpha=0.8)
        nx.draw_networkx_edges(G, pos, alpha=0.5, edge_color='gray')
        nx.draw_networkx_labels(G, pos, font_size=8)
        
        plt.title('Social Network Graph', size=15)
        plt.axis('off')
        
        buf = io.BytesIO()
        plt.savefig(buf, format='png')
        plt.close()
        buf.seek(0)
        plot_image = base64.b64encode(buf.read()).decode('utf-8')

        # --- Response ---
        response = {
            'results': {
                'metrics': {
                    'nodes': n_nodes,
                    'edges': n_edges,
                    'density': density
                },
                'centrality': {
                    'degree': degree_centrality,
                    'betweenness': betweenness_centrality,
                    'closeness': closeness_centrality,
                },
                'top_nodes': {
                    'degree': top_degree,
                    'betweenness': top_betweenness,
                    'closeness': top_closeness
                },
                'communities': communities
            },
            'plot': f"data:image/png;base64,{plot_image}"
        }

        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
