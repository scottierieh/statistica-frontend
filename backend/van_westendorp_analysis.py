
import sys
import json
import pandas as pd
import numpy as np
import warnings

warnings.filterwarnings('ignore')

def _to_native_type(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, (float, np.floating)):
        if np.isnan(obj):
            return None
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    return obj

def find_intersection(x1, y1, x2, y2):
    for i in range(len(x1) - 1):
        for j in range(len(x2) - 1):
            p1, p2 = (x1[i], y1[i]), (x1[i+1], y1[i+1])
            p3, p4 = (x2[j], y2[j]), (x2[j+1], y2[j+1])

            denominator = (p4[1] - p3[1]) * (p2[0] - p1[0]) - (p4[0] - p3[0]) * (p2[1] - p1[1])
            if denominator == 0:
                continue

            ua = ((p4[0] - p3[0]) * (p1[1] - p3[1]) - (p4[1] - p3[1]) * (p1[0] - p3[0])) / denominator
            ub = ((p2[0] - p1[0]) * (p1[1] - p3[1]) - (p2[1] - p1[1]) * (p1[0] - p3[0])) / denominator

            if 0 <= ua <= 1 and 0 <= ub <= 1:
                return p1[0] + ua * (p2[0] - p1[0]) # Return intersection X value
    return None

def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        too_cheap_col = payload.get('too_cheap_col')
        cheap_col = payload.get('cheap_col')
        expensive_col = payload.get('expensive_col')
        too_expensive_col = payload.get('too_expensive_col')

        if not all([data, too_cheap_col, cheap_col, expensive_col, too_expensive_col]):
            raise ValueError("Missing required parameters.")

        df = pd.DataFrame(data)
        
        price_cols = [too_cheap_col, cheap_col, expensive_col, too_expensive_col]
        for col in price_cols:
            df[col] = pd.to_numeric(df[col], errors='coerce')
        df = df.dropna(subset=price_cols)

        if df.shape[0] < 10:
            raise ValueError("Not enough valid data points for analysis.")

        prices = {
            'too_cheap': df[too_cheap_col].tolist(),
            'cheap': df[cheap_col].tolist(),
            'expensive': df[expensive_col].tolist(),
            'too_expensive': df[too_expensive_col].tolist(),
        }

        all_prices = sorted(list(set(p for col in prices.values() for p in col)))
        n = len(df)

        cumulative_percentages = {
            'prices': all_prices,
            'tooCheap': [sum(1 for p in prices['too_cheap'] if p >= price) / n * 100 for price in all_prices],
            'cheap': [sum(1 for p in prices['cheap'] if p >= price) / n * 100 for price in all_prices],
            'expensive': [sum(1 for p in prices['expensive'] if p <= price) / n * 100 for price in all_prices],
            'tooExpensive': [sum(1 for p in prices['too_expensive'] if p <= price) / n * 100 for price in all_prices],
        }

        not_too_cheap = [100 - val for val in cumulative_percentages['tooCheap']]
        not_expensive = [100 - val for val in cumulative_percentages['expensive']]

        opp = find_intersection(all_prices, not_too_cheap, all_prices, cumulative_percentages['expensive'])
        pme = find_intersection(all_prices, cumulative_percentages['tooExpensive'], all_prices, not_expensive)
        mdp = find_intersection(all_prices, cumulative_percentages['expensive'], all_prices, not_too_cheap)
        ipp = find_intersection(all_prices, cumulative_percentages['cheap'], all_prices, cumulative_percentages['expensive'])
        
        response = {
            'plot_data': {
                'prices': all_prices,
                'tooCheap': cumulative_percentages['tooCheap'],
                'cheap': cumulative_percentages['cheap'],
                'expensive': cumulative_percentages['expensive'],
                'tooExpensive': cumulative_percentages['tooExpensive'],
                'intersections': {
                    'optimal': opp,
                    'indifference': ipp,
                    'too_cheap': mdp,
                    'expensive': pme
                }
            }
        }

        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
