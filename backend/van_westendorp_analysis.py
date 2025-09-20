
import sys
import json
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import io
import base64

def _to_native_type(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    return obj

def find_intersection(x1, y1, x2, y2):
    """Finds the intersection of two lines defined by points."""
    intersections = []
    for i in range(len(x1) - 1):
        for j in range(len(x2) - 1):
            x1a, y1a = x1[i], y1[i]
            x1b, y1b = x1[i+1], y1[i+1]
            x2a, y2a = x2[j], y2[j]
            x2b, y2b = x2[j+1], y2[j+1]

            den = (x1a - x1b) * (y2a - y2b) - (y1a - y1b) * (x2a - x2b)
            if den == 0:
                continue

            t_num = (x1a - x2a) * (y2a - y2b) - (y1a - y2a) * (x2a - x2b)
            u_num = -((x1a - x1b) * (y1a - y2a) - (y1a - y1b) * (x1a - x2a))
            
            t = t_num / den
            u = u_num / den

            if 0 <= t <= 1 and 0 <= u <= 1:
                intersect_x = x1a + t * (x1b - x1a)
                intersections.append(intersect_x)
    
    return np.mean(intersections) if intersections else np.nan


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
        
        # Ensure all columns are numeric
        price_cols = [too_cheap_col, cheap_col, expensive_col, too_expensive_col]
        for col in price_cols:
            df[col] = pd.to_numeric(df[col], errors='coerce')
        df = df.dropna(subset=price_cols)

        if df.shape[0] < 10:
            raise ValueError("Not enough valid data points for analysis.")

        prices = np.sort(df[price_cols].values.flatten())
        unique_prices = np.unique(prices[~np.isnan(prices)])
        
        # Calculate cumulative frequencies
        too_cheap_freq = [np.mean(df[too_cheap_col] > p) * 100 for p in unique_prices]
        cheap_freq = [np.mean(df[cheap_col] > p) * 100 for p in unique_prices]
        expensive_freq = [np.mean(df[expensive_col] <= p) * 100 for p in unique_prices]
        too_expensive_freq = [np.mean(df[too_expensive_col] <= p) * 100 for p in unique_prices]
        
        # Find intersection points
        pmc = find_intersection(unique_prices, expensive_freq, unique_prices, [100 - val for val in cheap_freq])
        pme = find_intersection(unique_prices, cheap_freq, unique_prices, [100 - val for val in expensive_freq])
        ipp = find_intersection(unique_prices, too_cheap_freq, unique_prices, too_expensive_freq)
        opp = find_intersection(unique_prices, cheap_freq, unique_prices, too_expensive_freq)

        # --- Plotting ---
        plt.style.use('seaborn-v0_8-whitegrid')
        fig, ax = plt.subplots(figsize=(10, 7))
        
        ax.plot(unique_prices, too_cheap_freq, label='Not a Bargain (Cumulative %)', color='red', linestyle='--')
        ax.plot(unique_prices, [100-val for val in cheap_freq], label='Not Cheap (Cumulative %)', color='orange', linestyle='--')
        ax.plot(unique_prices, expensive_freq, label='Expensive (Cumulative %)', color='skyblue')
        ax.plot(unique_prices, too_expensive_freq, label='Too Expensive (Cumulative %)', color='blue')
        
        # Annotate intersection points
        if not np.isnan(opp): ax.axvline(x=opp, color='green', linestyle=':', label=f'Optimal Price (OPP): ${opp:.2f}')
        if not np.isnan(ipp): ax.axvline(x=ipp, color='purple', linestyle=':', label=f'Indifference Price (IPP): ${ipp:.2f}')
        if not np.isnan(pmc) and not np.isnan(pme):
            ax.axvspan(pmc, pme, alpha=0.1, color='gray', label=f'Acceptable Range: ${pmc:.2f}-${pme:.2f}')

        ax.set_title('Van Westendorp Price Sensitivity Meter', fontsize=16, fontweight='bold')
        ax.set_xlabel('Price', fontsize=12)
        ax.set_ylabel('Percentage of Respondents (%)', fontsize=12)
        ax.legend()
        ax.set_ylim(0, 100)
        
        buf = io.BytesIO()
        plt.savefig(buf, format='png', bbox_inches='tight')
        plt.close(fig)
        buf.seek(0)
        plot_image = base64.b64encode(buf.read()).decode('utf-8')

        response = {
            'results': {
                'prices': {
                    'too_cheap': ipp, 
                    'cheap': pmc, 
                    'expensive': pme, 
                    'too_expensive': np.nan, 
                    'optimal': opp,
                },
                'acceptable_range': [pmc, pme]
            },
            'plot': f"data:image/png;base64,{plot_image}",
        }

        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
