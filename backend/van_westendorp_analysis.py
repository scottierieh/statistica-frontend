
import sys
import json
import pandas as pd
import numpy as np
import plotly.graph_objects as go
import plotly.io as pio

def find_intersection(x1, y1, x2, y2):
    """Finds the intersection of two line segments."""
    intersections = []
    for i in range(len(x1) - 1):
        for j in range(len(x2) - 1):
            p1, p2 = (x1[i], y1[i]), (x1[i+1], y1[i+1])
            p3, p4 = (x2[j], y2[j]), (x2[j+1], y2[j+1])
            
            den = (p1[0] - p2[0]) * (p3[1] - p4[1]) - (p1[1] - p2[1]) * (p3[0] - p4[0])
            if den == 0:
                continue
            
            t = ((p1[0] - p3[0]) * (p3[1] - p4[1]) - (p1[1] - p3[1]) * (p3[0] - p4[0])) / den
            u = -((p1[0] - p2[0]) * (p1[1] - p3[1]) - (p1[1] - p2[1]) * (p1[0] - p3[0])) / den
            
            if 0 <= t <= 1 and 0 <= u <= 1:
                intersect_x = p1[0] + t * (p2[0] - p1[0])
                intersections.append(intersect_x)
    
    return intersections[0] if intersections else None


def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        too_cheap_col = payload.get('too_cheap_col')
        cheap_col = payload.get('cheap_col')
        expensive_col = payload.get('expensive_col')
        too_expensive_col = payload.get('too_expensive_col')

        if not all([data, too_cheap_col, cheap_col, expensive_col, too_expensive_col]):
            raise ValueError("Missing required data columns.")

        df = pd.DataFrame(data)
        n = len(df)

        price_range = np.linspace(df.min().min(), df.max().max(), num=200)

        too_cheap_pct = [np.sum(df[too_cheap_col] > p) / n * 100 for p in price_range]
        cheap_pct = [np.sum(df[cheap_col] > p) / n * 100 for p in price_range]
        expensive_pct = [np.sum(df[expensive_col] <= p) / n * 100 for p in price_range]
        too_expensive_pct = [np.sum(df[too_expensive_col] <= p) / n * 100 for p in price_range]
        
        not_cheap_pct = [100 - p for p in cheap_pct]
        not_expensive_pct = [100 - p for p in expensive_pct]

        opp = find_intersection(price_range, too_expensive_pct, price_range, not_cheap_pct)
        pme = find_intersection(price_range, expensive_pct, price_range, cheap_pct)
        mdp = find_intersection(price_range, expensive_pct, price_range, not_expensive_pct)
        ipp = find_intersection(price_range, cheap_pct, price_range, not_cheap_pct)


        plot_data = {
            'prices': price_range.tolist(),
            'too_cheap': too_cheap_pct,
            'cheap': cheap_pct,
            'expensive': expensive_pct,
            'too_expensive': too_expensive_pct
        }
        
        results = {
            'opp': opp, 'pme': pme, 'mdp': mdp, 'ipp': ipp
        }

        print(json.dumps({'results': results, 'plotData': plot_data}))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()

