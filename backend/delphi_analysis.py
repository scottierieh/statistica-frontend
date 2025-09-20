
import sys
import json
import pandas as pd
import numpy as np
import math
from scipy.stats import iqr

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
    n_e = (series >= threshold).sum()
    n_total = len(series)
    if n_total == 0:
        return 0
    return (n_e - (n_total / 2)) / (n_total / 2)

def calculate_consensus(series):
    """Calculate consensus based on interquartile range."""
    if len(series) < 2:
        return np.nan
    q1 = series.quantile(0.25)
    q3 = series.quantile(0.75)
    return q3 - q1

def calculate_convergence(series_round1, series_round2):
    """Calculate convergence as the change in IQR."""
    iqr1 = calculate_consensus(series_round1)
    iqr2 = calculate_consensus(series_round2)
    return iqr1 - iqr2 if not (np.isnan(iqr1) or np.isnan(iqr2)) else np.nan


def calculate_stability(series):
    """Calculate stability using the coefficient of variation (CV)."""
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
        
        results = {}
        
        # Calculate stats for each round
        for round_config in rounds:
            round_name = round_config['name']
            items = round_config['items']
            
            round_results = {}
            for item_col in items:
                if item_col not in df.columns:
                    continue
                    
                series = pd.to_numeric(df[item_col], errors='coerce').dropna()
                
                if series.empty:
                    continue

                round_results[item_col] = {
                    'mean': series.mean(),
                    'std': series.std(),
                    'median': series.median(),
                    'q1': series.quantile(0.25),
                    'q3': series.quantile(0.75),
                    'cvr': calculate_cvr(series, cvr_threshold),
                    'consensus': calculate_consensus(series),
                    'stability': calculate_stability(series)
                }
            results[round_name] = round_results
        
        # Calculate convergence between rounds
        # This assumes item names are consistent across rounds, e.g., 'item1_r1', 'item1_r2'
        if len(rounds) > 1:
            all_base_items = set()
            for r in rounds:
                for item_col in r['items']:
                    base_name = '_'.join(item_col.split('_')[:-1]) # e.g., 'item1_r1' -> 'item1'
                    if base_name:
                         all_base_items.add(base_name)

            for i in range(len(rounds) - 1):
                round1_config = rounds[i]
                round2_config = rounds[i+1]
                
                convergence_results = {}
                for base_item in all_base_items:
                    # Find corresponding columns in round 1 and 2
                    item1_col = next((col for col in round1_config['items'] if '_'.join(col.split('_')[:-1]) == base_item), None)
                    item2_col = next((col for col in round2_config['items'] if '_'.join(col.split('_')[:-1]) == base_item), None)

                    if item1_col and item2_col and item1_col in df.columns and item2_col in df.columns:
                        series1 = pd.to_numeric(df[item1_col], errors='coerce').dropna()
                        series2 = pd.to_numeric(df[item2_col], errors='coerce').dropna()
                        
                        if not series1.empty and not series2.empty:
                            convergence = calculate_convergence(series1, series2)
                            convergence_results[item2_col] = convergence

                # Store convergence on the later round's results
                if round2_config['name'] in results:
                    for item_col, conv_val in convergence_results.items():
                         if item_col in results[round2_config['name']]:
                            results[round2_config['name']][item_col]['convergence'] = conv_val


        print(json.dumps({'results': results}, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
