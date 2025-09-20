

import sys
import json
import pandas as pd
import numpy as np
import math
from scipy.stats import iqr
import pingouin as pg

def _to_native_type(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, (np.floating, float)):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, np.bool_):
        return bool(obj)
    return obj

def calculate_cvr(series, threshold):
    """Calculate Content Validity Ratio."""
    Ne = (series >= threshold).sum()
    N = len(series)
    if N == 0:
        return 0
    return (Ne - (N / 2)) / (N / 2)

def calculate_consensus(series):
    """Calculate consensus based on interquartile range."""
    if len(series) < 2:
        return np.nan
    
    series_range = series.max() - series.min()
    if series_range == 0:
        return 1.0 # Perfect consensus if all values are the same

    return 1 - (iqr(series) / series_range)


def calculate_cv(series):
    """Calculate Coefficient of Variation."""
    mean = series.mean()
    std = series.std()
    if mean == 0:
        return np.inf
    return std / mean

def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        rounds = payload.get('rounds', []) # Expects [{ 'name': 'Round 1', 'items': ['item1', 'item2'] }]
        scale_max = int(payload.get('scaleMax', 5))
        cvr_threshold = float(payload.get('cvrThreshold', 4))

        if not data or not rounds:
            raise ValueError("Missing 'data' or 'rounds' configuration.")

        df = pd.DataFrame(data)
        
        all_results = {}
        
        # Calculate stats for each round
        for round_config in rounds:
            round_name = round_config['name']
            items = round_config['items']
            
            round_results = {}
            if not items:
                continue

            # Convert all relevant columns to numeric and then drop rows with any NaN in those columns
            round_df_numeric = df[items].apply(pd.to_numeric, errors='coerce')
            round_df_clean = round_df_numeric.dropna()
            
            for item_col in items:
                if item_col not in round_df_clean.columns:
                    continue
                    
                series = round_df_clean[item_col]
                
                if series.empty:
                    continue

                q1 = series.quantile(0.25)
                median_val = series.median()

                round_results[item_col] = {
                    'mean': series.mean(),
                    'std': series.std(),
                    'median': median_val,
                    'q1': q1,
                    'q3': series.quantile(0.75),
                    'cvr': calculate_cvr(series, cvr_threshold),
                    'consensus': calculate_consensus(series),
                    'convergence': median_val - q1,
                    'cv': calculate_cv(series),
                    'positive_responses': (series >= cvr_threshold).sum(),
                    'stability': np.nan, # Initialize stability
                }
            
            # Calculate Cronbach's Alpha for the round, using the cleaned dataframe
            cronbach_alpha = np.nan
            if not round_df_clean.empty and len(round_df_clean.columns) > 1:
                cronbach_alpha = pg.cronbach_alpha(data=round_df_clean)[0]
            
            all_results[round_name] = {
                "items": round_results,
                "cronbach_alpha": cronbach_alpha
            }
        
        # Calculate Stability between rounds if more than one round exists
        if len(rounds) > 1:
            for i in range(1, len(rounds)):
                prev_round_name = rounds[i-1]['name']
                curr_round_name = rounds[i]['name']
                
                prev_results = all_results.get(prev_round_name, {}).get('items', {})
                curr_results = all_results.get(curr_round_name, {}).get('items', {})

                # Assuming items are named consistently (e.g., 'item1_r1', 'item1_r2')
                # We need a mapping between items across rounds. Let's assume the base name is the same.
                for item_base_name in set(key.split('_')[0] for key in prev_results.keys()) & set(key.split('_')[0] for key in curr_results.keys()):
                    prev_item_key = next((k for k in prev_results if k.startswith(item_base_name)), None)
                    curr_item_key = next((k for k in curr_results if k.startswith(item_base_name)), None)

                    if prev_item_key and curr_item_key:
                        prev_mean = prev_results[prev_item_key]['mean']
                        curr_mean = curr_results[curr_item_key]['mean']
                        
                        if prev_mean != 0:
                            stability = abs(curr_mean - prev_mean) / prev_mean
                            all_results[curr_round_name]['items'][curr_item_key]['stability'] = stability


        print(json.dumps({'results': all_results}, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()

