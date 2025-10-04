
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

def get_nps_interpretation(score):
    if score >= 70:
        return "Excellent: Your customers are highly loyal and are actively promoting your brand, which is a strong indicator of future growth."
    elif score >= 50:
        return "Very Good: You have a strong base of satisfied customers. Focusing on converting Passives can elevate your score further."
    elif score >= 30:
        return "Good: A solid performance, but there is clear room for improvement. Investigate feedback from Passives and Detractors."
    elif score >= 0:
        return "Fair: Your customer base is lukewarm. It's crucial to understand the reasons for dissatisfaction among Detractors to prevent negative word-of-mouth."
    else:
        return "Poor: Your company has more detractors than promoters, indicating significant issues with customer satisfaction that need immediate attention."

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

    score_counts = {str(i): int(np.sum(scores == i)) for i in range(11)}

    return {
        "npsScore": nps_score,
        "promoters": int(promoters),
        "passives": int(passives),
        "detractors": int(detractors),
        "total": int(total),
        "interpretation": get_nps_interpretation(nps_score)
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

if