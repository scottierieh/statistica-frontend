

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

def _generate_interpretation(round_results: dict):
    interpretation = ""
    # Cronbach's Alpha Interpretation
    alpha = round_results.get('cronbach_alpha')
    if alpha is not None:
        alpha_level = "Excellent" if alpha >= 0.9 else "Good" if alpha >= 0.8 else "Acceptable" if alpha >= 0.7 else "Questionable" if alpha >= 0.6 else "Poor"
        interpretation += f"The reliability of the survey, indicated by Cronbach's Alpha, is {alpha:.3f}, which is considered '{alpha_level}'.\n\n"

    # Item-level interpretation
    valid_items = []
    needs_review_items = []
    
    for item, stats in round_results.get('items', {}).items():
        is_valid = True
        reasons = []
        if stats.get('cvr', -1) < 0: # Assuming 0 is a minimum CVR, Lawshe's table is more complex.
            is_valid = False
            reasons.append("Low CVR")
        if stats.get('consensus', 0) < 0.75:
            is_valid = False
            reasons.append("Low Consensus")
        if stats.get('convergence', 1) > 1.0:
            is_valid = False
            reasons.append("Low Convergence")
        if stats.get('stability', 1) > 0.5:
            is_valid = False
            reasons.append("Low Stability (High CV)")
            
        if is_valid:
            valid_items.append(item)
        else:
            needs_review_items.append(f"{item} ({', '.join(reasons)})")

    if valid_items:
        interpretation += f"**Valid Items:** {len(valid_items)} items ({', '.join(valid_items)}) appear valid, meeting the criteria for content validity, consensus, convergence, and stability.\n"
    if needs_review_items:
        interpretation += f"**Items for Review:** {len(needs_review_items)} items ({'; '.join(needs_review_items)}) did not meet one or more criteria and should be reviewed, revised, or removed in the next round.\n"

    return interpretation.strip()

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
                    'stability': calculate_cv(series),
                    'positive_responses': (series >= cvr_threshold).sum(),
                }
            
            # Calculate Cronbach's Alpha for the round, using the cleaned dataframe
            cronbach_alpha = np.nan
            if not round_df_clean.empty and len(round_df_clean.columns) > 1:
                try:
                    cronbach_alpha = pg.cronbach_alpha(data=round_df_clean)[0]
                except Exception:
                    cronbach_alpha = np.nan
            
            current_round_data = {
                "items": round_results,
                "cronbach_alpha": cronbach_alpha
            }
            
            # Generate interpretation for the current round
            current_round_data["interpretation"] = _generate_interpretation(current_round_data)

            all_results[round_name] = current_round_data
        
        print(json.dumps({'results': all_results}, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
