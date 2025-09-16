
import sys
import json
import pandas as pd
import pingouin as pg
import numpy as np

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
        
        # Manual calculation for item-total statistics
        item_stats = {}
        total_score = df_items.sum(axis=1)
        
        corrected_item_total_correlations = {}
        alpha_if_deleted = {}

        for item in df_items.columns:
            # Corrected Item-Total Correlation
            item_score = df_items[item]
            rest_score = total_score - item_score
            correlation = pg.corr(item_score, rest_score)['r'].iloc[0]
            corrected_item_total_correlations[item] = correlation
            
            # Cronbach's Alpha if item deleted
            alpha_if_del = pg.cronbach_alpha(data=df_items.drop(columns=item))[0]
            alpha_if_deleted[item] = alpha_if_del

        response = {
            'alpha': alpha_results[0],
            'n_items': df_items.shape[1],
            'n_cases': df_items.shape[0],
            'confidence_interval': list(alpha_results[1]),
            'sem': df_items.sum(axis=1).std() * (1 - alpha_results[0])**0.5,
            'item_statistics': {
                'means': df_items.mean().to_dict(),
                'stds': df_items.std().to_dict(),
                'corrected_item_total_correlations': corrected_item_total_correlations,
                'alpha_if_deleted': alpha_if_deleted,
            },
            'scale_statistics': {
                'mean': total_score.mean(),
                'std': total_score.std(),
                'variance': total_score.var(),
                'avg_inter_item_correlation': df_items.corr().values[np.triu_indices_from(df_items.corr().values, k=1)].mean()
            }
        }
        
        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
