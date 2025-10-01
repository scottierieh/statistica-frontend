
import sys
import json
import pandas as pd
import plotly.graph_objects as go
import plotly.io as pio

def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        source_col = payload.get('source_col')
        target_col = payload.get('target_col')

        if not all([data, source_col, target_col]):
            raise ValueError("Missing 'data', 'source_col', or 'target_col'")

        df = pd.DataFrame(data)
        df.dropna(subset=[source_col, target_col], inplace=True)
        
        if df.empty:
            raise ValueError("No valid data for Sankey diagram after dropping NA.")

        # Create labels for nodes
        source_labels = df[source_col].unique().tolist()
        target_labels = df[target_col].unique().tolist()
        all_labels = source_labels + target_labels

        # Create a mapping from label to index
        label_map = {label: i for i, label in enumerate(all_labels)}
        
        # Create links
        link_data = df.groupby([source_col, target_col]).size().reset_index(name='value')
        
        source_indices = [label_map[s] for s in link_data[source_col]]
        target_indices = [label_map[t] for t in link_data[target_col]]
        values = link_data['value'].tolist()

        fig = go.Figure(data=[go.Sankey(
            node=dict(
                pad=15,
                thickness=20,
                line=dict(color="black", width=0.5),
                label=all_labels,
            ),
            link=dict(
                source=source_indices,
                target=target_indices,
                value=values
            )
        )])

        fig.update_layout(
            title_text=f"Sankey Diagram: {source_col} to {target_col}",
            font_size=12
        )
        
        plot_json = pio.to_json(fig)
        
        response = {
            'plot': plot_json,
        }
        
        print(json.dumps(response))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
