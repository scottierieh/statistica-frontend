
import sys
import json
import numpy as np

def _to_native_type(obj):
    if isinstance(obj, np.integer): return int(obj)
    elif isinstance(obj, (float, np.floating)):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return float(obj)
    elif isinstance(obj, np.ndarray): return obj.tolist()
    return obj

def calculate_nps(scores):
    if not scores:
        return {}
        
    scores = np.array(scores)
    promoters = np.sum(scores >= 9)
    detractors = np.sum(scores <= 6)
    passives = len(scores) - promoters - detractors
    total = len(scores)

    promotersP = (promoters / total) * 100 if total > 0 else 0
    detractorsP = (detractors / total) * 100 if total > 0 else 0
    
    nps_score = promotersP - detractorsP

    score_counts = {i: int(np.sum(scores == i)) for i in range(11)}

    return {
        "nps": nps_score,
        "promoters": int(promoters),
        "passives": int(passives),
        "detractors": int(detractors),
        "promotersP": promotersP,
        "passivesP": (passives / total) * 100 if total > 0 else 0,
        "detractorsP": detractorsP,
        "scoreCounts": score_counts,
        "total": int(total)
    }

def main():
    try:
        payload = json.load(sys.stdin)
        scores = payload.get('scores')

        if scores is None:
            raise ValueError("Missing 'scores' data")

        results = calculate_nps(scores)
        
        response = { "results": results }
        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
