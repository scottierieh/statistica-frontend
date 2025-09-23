

import sys
import json
import pandas as pd
import numpy as np
import networkx as nx
from networkx.algorithms import community
import plotly.graph_objects as go
import plotly.io as pio
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
        
        is_connected = nx.is_connected(G) if not is_directed else nx.is_strongly_connected(G)
        num_components = nx.number_connected_components(G) if not is_directed else nx.number_strongly_connected_components(G)

        # --- Centrality Measures ---
        degree_centrality = nx.degree_centrality(G)
        betweenness_centrality = nx.betweenness_centrality(G, weight=weight_col)
        closeness_centrality = nx.closeness_centrality(G, distance=weight_col)
        eigenvector_centrality = nx.eigenvector_centrality(G, weight=weight_col, max_iter=500, tol=1e-06) if n_nodes > 0 else {}
        pagerank = nx.pagerank(G, weight=weight_col)

        # --- Top Nodes ---
        top_degree = sorted(degree_centrality.items(), key=lambda x: x[1], reverse=True)[:5]
        top_betweenness = sorted(betweenness_centrality.items(), key=lambda x: x[1], reverse=True)[:5]
        top_closeness = sorted(closeness_centrality.items(), key=lambda x: x[1], reverse=True)[:5]
        top_eigenvector = sorted(eigenvector_centrality.items(), key=lambda x: x[1], reverse=True)[:5]

        # --- Community Detection (Louvain) ---
        communities = []
        if not is_directed and n_nodes > 0:
            try:
                detected_communities = nx.community.louvain_communities(G, weight=weight_col, seed=42)
                communities = [list(c) for c in detected_communities]
            except Exception:
                communities = []
                
        # --- Interactive Plotly Visualization ---
        pos = nx.spring_layout(G, k=0.8, iterations=50, seed=42)
        
        edge_x, edge_y = [], []
        for edge in G.edges():
            x0, y0 = pos[edge[0]]
            x1, y1 = pos[edge[1]]
            edge_x.extend([x0, x1, None])
            edge_y.extend([y0, y1, None])

        edge_trace = go.Scatter(x=edge_x, y=edge_y, line=dict(width=0.5, color='#b5a888'), hoverinfo='none', mode='lines')

        node_x, node_y, node_text, node_info, node_size, node_color = [], [], [], [], [], []
        for node in G.nodes():
            x, y = pos[node]
            node_x.append(x)
            node_y.append(y)
            node_text.append(node)
            node_info.append(f'Node: {node}<br>Degree: {G.degree(node)}')
            node_size.append(degree_centrality.get(node, 0) * 50 + 10)
            node_color.append(degree_centrality.get(node, 0))

        node_trace = go.Scatter(x=node_x, y=node_y, mode='markers+text', text=node_text, textposition='top center',
                                hoverinfo='text', hovertext=node_info,
                                marker=dict(showscale=True, colorscale=[[0, '#a8b5a3'], [1, '#6b7565']], reversescale=True,
                                            color=node_color, size=node_size,
                                            colorbar=dict(thickness=15, title=dict(text='Node Connections', side='right'), xanchor='left'),
                                            line_width=2))

        fig = go.Figure(data=[edge_trace, node_trace],
                        layout=go.Layout(title='Interactive Social Network', showlegend=False, hovermode='closest',
                                         margin=dict(b=20, l=5, r=5, t=40),
                                         xaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
                                         yaxis=dict(showgrid=False, zeroline=False, showticklabels=False)))

        plot_json = pio.to_json(fig)

        # --- Response ---
        response = {
            'results': {
                'metrics': { 'nodes': n_nodes, 'edges': n_edges, 'density': density, 'is_connected': is_connected, 'components': num_components },
                'centrality': { 'degree': degree_centrality, 'betweenness': betweenness_centrality, 'closeness': closeness_centrality, 'eigenvector': eigenvector_centrality },
                'top_nodes': { 'degree': top_degree, 'betweenness': top_betweenness, 'closeness': top_closeness, 'eigenvector': top_eigenvector },
                'communities': communities
            },
            'plot': plot_json
        }

        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
