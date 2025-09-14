
import sys
import json
import pandas as pd
import numpy as np
import io
import base64
import matplotlib.pyplot as plt
import seaborn as sns

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

        if not data or not variables:
            raise ValueError("Missing 'data' or 'variables'")

        df = pd.DataFrame(data)
        results = {}

        for var in variables:
            if var not in df.columns:
                results[var] = {"error": f"Variable '{var}' not found in data."}
                continue

            # Drop missing values for the current variable
            series = df[var].dropna()
            
            if series.empty:
                results[var] = {"error": f"No valid data for variable '{var}'."}
                continue

            freq_table = series.value_counts().reset_index()
            freq_table.columns = ['Value', 'Frequency']
            total = freq_table['Frequency'].sum()
            
            freq_table['Percentage'] = (freq_table['Frequency'] / total) * 100
            freq_table['Cumulative Percentage'] = freq_table['Percentage'].cumsum()

            # --- Plotting ---
            plt.figure(figsize=(8, 5))
            # Sort by index (Value) for better bar chart readability if numeric-like
            try:
                sorted_table = freq_table.sort_values('Value')
            except TypeError: # Can't sort if mixed types
                sorted_table = freq_table.sort_values('Frequency', ascending=False)
            
            # Limit to top 20 categories for readability
            plot_data = sorted_table.head(20)

            sns.barplot(x='Frequency', y='Value', data=plot_data, orient='h', palette='viridis')
            plt.title(f'Frequency Distribution of {var}')
            plt.xlabel('Frequency')
            plt.ylabel(var)
            plt.tight_layout()
            
            buf = io.BytesIO()
            plt.savefig(buf, format='png')
            plt.close()
            buf.seek(0)
            plot_image = base64.b64encode(buf.read()).decode('utf-8')

            results[var] = {
                'table': freq_table.to_dict('records'),
                'summary': {
                    'total_count': int(total),
                    'unique_categories': len(freq_table),
                    'mode': freq_table.iloc[0]['Value'] if not freq_table.empty else None
                },
                'plot': f"data:image/png;base64,{plot_image}"
            }

        print(json.dumps({'results': results}, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
