
import sys
import json
import numpy as np

def _to_native_type(obj):
    if isinstance(obj, np.integer): return int(obj)
    if isinstance(obj, (np.floating, float)):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return float(obj)
    elif isinstance(obj, np.ndarray): return obj.tolist()
    return obj

def get_stats(data):
    if not data:
        return {}
    
    arr = np.array(data)
    mean_val = np.mean(arr)
    std_dev_val = np.std(arr, ddof=1) if len(arr) > 1 else 0
    median_val = np.median(arr)
    
    counts = np.bincount(arr.astype(int))
    mode_val = np.argmax(counts) if len(counts) > 0 else None

    return {
        "mean": mean_val,
        "stdDev": std_dev_val,
        "median": median_val,
        "mode": int(mode_val) if mode_val is not None else None,
        "count": len(arr)
    }

def main():
    try:
        payload = json.load(sys.stdin)
        ratings = payload.get('ratings')
        scale = payload.get('scale', 5)

        if ratings is None:
            raise ValueError("Missing 'ratings' data")

        stats = get_stats(ratings)
        
        response = {
            "results": {**stats, "scale": scale}
        }
        
        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
