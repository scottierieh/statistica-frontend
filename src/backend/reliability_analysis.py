

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

def get_alpha_interpretation_level(alpha):
    if alpha >= 0.9: return 'Excellent'
    if alpha >= 0.8: return 'Good'
    if alpha >= 0.7: return 'Acceptable'
    if alpha >= 0.6: return 'Questionable'
    if alpha >= 0.5: return 'Poor'
    return 'Unacceptable'


def _generate_interpretation(results):
    alpha = results['alpha']
    n_items = results['n_items']
    alpha_if_deleted = results['item_statistics']['alpha_if_deleted']
    
    alpha_level = get_alpha_interpretation_level(alpha)

    # Paragraph 1: Main finding and explanation
    interp = (
        f"Internal reliability for the {n_items}-item scale was investigated using Cronbach's alpha. "
        f"The analysis indicated that the alpha for the total scale was {alpha_level.lower()} (α = {alpha:.2f}).\n\n"
        f"Cronbach's alpha assesses the extent to which items on a scale are intercorrelated and measure a single underlying construct. "
        f"A {alpha_level.lower()} alpha suggests that the items {'consistently' if alpha >= 0.7 else 'may not be consistently'} measuring the same concept.\n\n"
    )

    # Paragraph 2: Recommendations
    items_to_consider_removing = [item for item, new_alpha in alpha_if_deleted.items() if new_alpha > alpha]

    if items_to_consider_removing:
        final_alpha_if_all_removed = pg.cronbach_alpha(data=results['df_items'].drop(columns=items_to_consider_removing))[0]
        
        interp += (
            "Examination of individual item statistics suggests that reliability could be improved by eliminating several items. "
            "Specifically, removing each of the following items would individually increase the scale's alpha: "
            f"{', '.join([f'“{item}”' for item in items_to_consider_removing])}. "
            f"If all these items were removed, the final reliability for the resulting {n_items - len(items_to_consider_removing)}-item scale would be considered "
            f"{get_alpha_interpretation_level(final_alpha_if_all_removed).lower()} (α = {final_alpha_if_all_removed:.2f})."
        )
    elif alpha < 0.7:
         interp += "Given this poor reliability, it is recommended that the items of this scale be carefully reviewed and revised. Consideration should be given to item clarity, relevance, and potential redundancy, and further psychometric evaluation would be necessary to improve its consistency."
    else:
        interp += "The scale demonstrates good internal consistency, and no single item's removal would substantially improve reliability."


    return interp.strip()


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
        total_score = df_items.sum(axis=1)
        
        corrected_item_total_correlations = {}
        alpha_if_deleted = {}

        for item in df_items.columns:
            item_score = df_items[item]
            rest_score = total_score - item_score
            correlation = pg.corr(item_score, rest_score)['r'].iloc[0]
            corrected_item_total_correlations[item] = correlation
            
            alpha_if_del = pg.cronbach_alpha(data=df_items.drop(columns=item))[0]
            alpha_if_deleted[item] = alpha_if_del

        response = {
            'alpha': alpha_results[0],
            'n_items': df_items.shape[1],
            'n_cases': df_items.shape[0],
            'confidence_interval': list(alpha_results[1]),
            'sem': df_items.sum(axis=1).std() * (1 - alpha_results[0])**0.5 if alpha_results[0] >= 0 else np.nan,
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
            },
            'df_items': df_items.to_dict('records')
        }
        
        response['interpretation'] = _generate_interpretation(response)
        
        # remove temporary data from final response
        del response['df_items']

        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
