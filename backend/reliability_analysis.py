import sys
import json
import pandas as pd
import pingouin as pg

def reliability_analysis():
    try:
        # Read data from stdin
        input_data = sys.stdin.read()
        payload = json.loads(input_data)
        
        data = payload.get('data')
        items = payload.get('items')
        reverse_code_items = payload.get('reverseCodeItems', [])

        if not data or not items:
            print(json.dumps({"error": "Missing 'data' or 'items' in request"}), file=sys.stderr)
            sys.exit(1)
        
        df = pd.DataFrame(data)

        # Ensure all selected items exist in the dataframe
        all_cols = set(items)
        missing_cols = [col for col in all_cols if col not in df.columns]
        if missing_cols:
            print(json.dumps({"error": f"Columns not found in data: {', '.join(missing_cols)}"}), file=sys.stderr)
            sys.exit(1)
            
        # Select only the specified items
        df_items = df[items]

        # Reverse code items if needed
        for col in reverse_code_items:
            if col in df_items.columns:
                max_val = df_items[col].max()
                min_val = df_items[col].min()
                df_items[col] = max_val + min_val - df_items[col]
        
        # Drop rows with any missing values in the selected items
        df_items.dropna(inplace=True)
        if df_items.shape[0] < 2:
            print(json.dumps({"error": "Not enough valid data for analysis after handling missing values."}), file=sys.stderr)
            sys.exit(1)

        # Calculate Cronbach's alpha and related stats
        alpha_results = pg.cronbach_alpha(data=df_items, nan_policy='listwise')
        
        # Item-total statistics
        item_stats = pg.multivariate_corr(df_items.sum(axis=1), df_items)

        alpha_if_deleted = {}
        for item in df_items.columns:
            sub_df = df_items.drop(columns=item)
            alpha_if_deleted[item] = pg.cronbach_alpha(data=sub_df)[0]
            
        inter_item_corrs = df_items.corr()
        avg_inter_item_corr = inter_item_corrs.values[inter_item_corrs.values != 1].mean()

        response = {
            'alpha': alpha_results[0],
            'n_items': df_items.shape[1],
            'n_cases': df_items.shape[0],
            'confidence_interval': list(alpha_results[1]),
            'sem': df_items.sum(axis=1).std() * (1 - alpha_results[0])**0.5,
            'item_statistics': {
                'means': df_items.mean().to_dict(),
                'stds': df_items.std().to_dict(),
                'corrected_item_total_correlations': item_stats['r'].to_dict(),
                'alpha_if_deleted': alpha_if_deleted,
            },
            'scale_statistics': {
                'mean': df_items.sum(axis=1).mean(),
                'std': df_items.sum(axis=1).std(),
                'variance': df_items.sum(axis=1).var(),
                'avg_inter_item_correlation': avg_inter_item_corr
            }
        }
        
        print(json.dumps(response))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    reliability_analysis()
