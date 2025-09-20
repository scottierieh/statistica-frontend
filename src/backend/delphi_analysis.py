
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
    return 1 - (iqr(series) / (series.max() - series.min())) if (series.max() - series.min()) > 0 else 1

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
            if not items:
                continue

            round_df = df[items]
            round_df = round_df.apply(pd.to_numeric, errors='coerce').dropna()
            
            for item_col in items:
                if item_col not in round_df.columns:
                    continue
                    
                series = round_df[item_col].dropna()
                
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
                    'positive_responses': (series >= cvr_threshold).sum(),
                }
            
            # Calculate Cronbach's Alpha for the round
            cronbach_alpha = pg.cronbach_alpha(data=round_df)[0] if len(items) > 1 else np.nan
            
            results[round_name] = {
                "items": round_results,
                "cronbach_alpha": cronbach_alpha
            }
        
        print(json.dumps({'results': results}, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
