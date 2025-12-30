
import sys
import json
import pandas as pd
import numpy as np
from typing import List, Dict, Any, Optional

def get_column_stats(series: pd.Series) -> Dict[str, Any]:
    stats = {}
    
    # Common stats
    stats['name'] = series.name
    stats['total_count'] = len(series)
    stats['missing_count'] = int(series.isnull().sum())
    stats['missing_percentage'] = float(series.isnull().sum() / len(series) * 100) if len(series) > 0 else 0
    stats['unique_count'] = series.nunique()

    # Type detection
    if pd.api.types.is_numeric_dtype(series.dropna()):
        stats['type'] = 'numeric'
        desc = series.describe()
        stats['mean'] = desc.get('mean')
        stats['std'] = desc.get('std')
        stats['min'] = desc.get('min')
        stats['25%'] = desc.get('25%')
        stats['50%'] = desc.get('50%')
        stats['75%'] = desc.get('75%')
        stats['max'] = desc.get('max')
    elif pd.api.types.is_datetime64_any_dtype(series.dropna()):
        stats['type'] = 'datetime'
        stats['min'] = series.min().isoformat() if not series.empty and pd.notna(series.min()) else None
        stats['max'] = series.max().isoformat() if not series.empty and pd.notna(series.max()) else None
    else:
        stats['type'] = 'categorical'
        # Get top 5 value counts
        value_counts = series.value_counts()
        stats['top_values'] = value_counts.head(5).to_dict()

    return stats

def _to_native_type(obj):
    if isinstance(obj, np.integer): return int(obj)
    if isinstance(obj, (np.floating, float)):
        return None if np.isnan(obj) or np.isinf(obj) else float(obj)
    if isinstance(obj, np.ndarray): return obj.tolist()
    if isinstance(obj, np.bool_): return bool(obj)
    return obj

def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')

        if not data:
            raise ValueError("No data provided")

        df = pd.DataFrame(data)
        if df.empty:
            print(json.dumps({"error": "Empty dataset provided"}), file=sys.stderr)
            sys.exit(1)

        summary = [get_column_stats(df[col]) for col in df.columns]
        
        # Convert numpy types to native Python types for JSON serialization
        json_compatible_summary = json.loads(json.dumps(summary, default=_to_native_type))
        
        print(json.dumps({"summary": json_compatible_summary}))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
