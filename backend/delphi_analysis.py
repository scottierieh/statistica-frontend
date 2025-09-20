
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
    Ne = (series >= threshold).sum()
    N = len(series)
    if N == 0:
        return 0
    return (Ne - (N / 2)) / (N / 2)

def calculate_consensus(series):
    """Calculate consensus based on interquartile range."""
    if len(series) < 2:
        return np.nan
    q1 = series.quantile(0.25)
    q3 = series.quantile(0.75)
    return q3 - q1

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
                    'stability': calculate_stability(series),
                    'convergence': median_val - q1,
                }
            results[round_name] = round_results
        
        print(json.dumps({'results': results}, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
