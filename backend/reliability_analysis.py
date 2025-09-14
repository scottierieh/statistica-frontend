
import sys
import json
import pandas as pd
import pingouin as pg

def main():
    try:
        input_data = json.load(sys.stdin)
        
        data = input_data.get('data')
        items = input_data.get('items')
        reverse_code_items = input_data.get('reverseCodeItems', [])

        if not data or not items:
            raise ValueError("Missing 'data' or 'items' in request")
        
        df = pd.DataFrame(data)

        all_cols = set(items)
        missing_cols = [col for col in all_cols if col not in df.columns]
        if missing_cols:
            raise ValueError(f"Columns not found in data: {', '.join(missing_cols)}")
            
        df_items = df[items].copy()

        for col in reverse_code_items:
            if col in df_items.columns:
                max_val = df_items[col].max()
                min_val = df_items[col].min()
                df_items[col] = max_val + min_val - df_items[col]
        
        df_items.dropna(inplace=True)
        if df_items.shape[0] < 2:
            raise ValueError("Not enough valid data for analysis after handling missing values.")

        alpha_results = pg.cronbach_alpha(data=df_items, nan_policy='listwise')
        item_total_corr = pg.item_reliability(df_items)

        response = {
            'alpha': alpha_results[0],
            'n_items': df_items.shape[1],
            'n_cases': df_items.shape[0],
            'confidence_interval': list(alpha_results[1]),
            'sem': df_items.sum(axis=1).std() * (1 - alpha_results[0])**0.5,
            'item_statistics': {
                'means': df_items.mean().to_dict(),
                'stds': df_items.std().to_dict(),
                'corrected_item_total_correlations': item_total_corr['item-total_corr'].to_dict(),
                'alpha_if_deleted': item_total_corr['alpha_if_deleted'].to_dict(),
            },
            'scale_statistics': {
                'mean': df_items.sum(axis=1).mean(),
                'std': df_items.sum(axis=1).std(),
                'variance': df_items.sum(axis=1).var(),
                'avg_inter_item_correlation': df_items.corr().values[df_items.corr().values != 1].mean()
            }
        }
        
        print(json.dumps(response))

    except Exception as e:
        # Instead of printing to stdout, print errors to stderr
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
