
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

def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        price_col = payload.get('price_col')
        purchase_intent_col = payload.get('purchase_intent_col')

        if not all([data, price_col, purchase_intent_col]):
            raise ValueError("Missing required parameters: data, price_col, or purchase_intent_col.")

        df = pd.DataFrame(data)
        
        # Ensure columns are numeric
        df[price_col] = pd.to_numeric(df[price_col], errors='coerce')
        df[purchase_intent_col] = pd.to_numeric(df[purchase_intent_col], errors='coerce')
        df = df.dropna(subset=[price_col, purchase_intent_col])

        if df.shape[0] < 10:
            raise ValueError("Not enough valid data points for analysis.")

        # Aggregate purchase likelihood at each price point
        demand_curve = df.groupby(price_col)[purchase_intent_col].mean().reset_index()
        demand_curve.rename(columns={purchase_intent_col: 'likelihood'}, inplace=True)
        demand_curve['revenue'] = demand_curve[price_col] * demand_curve['likelihood']
        
        # Find optimal price point (that maximizes revenue)
        optimal_price_row = demand_curve.loc[demand_curve['revenue'].idxmax()]
        optimal_price = optimal_price_row[price_col]
        max_revenue = optimal_price_row['revenue']

        # --- Plotting ---
        plt.style.use('seaborn-v0_8-whitegrid')
        fig, ax1 = plt.subplots(figsize=(10, 6))

        # Demand Curve
        color1 = 'tab:blue'
        ax1.set_xlabel('Price')
        ax1.set_ylabel('Purchase Likelihood', color=color1)
        ax1.plot(demand_curve[price_col], demand_curve['likelihood'], color=color1, marker='o', label='Demand Curve')
        ax1.tick_params(axis='y', labelcolor=color1)
        ax1.axvline(x=optimal_price, color='green', linestyle='--', label=f'Optimal Price: ${optimal_price:.2f}')

        # Revenue Curve
        ax2 = ax1.twinx()
        color2 = 'tab:red'
        ax2.set_ylabel('Potential Revenue', color=color2)
        ax2.plot(demand_curve[price_col], demand_curve['revenue'], color=color2, marker='x', linestyle='--', label='Revenue Curve')
        ax2.tick_params(axis='y', labelcolor=color2)
        
        fig.suptitle('Gabor-Granger Price Analysis', fontsize=16, fontweight='bold')
        fig.legend(loc="upper right", bbox_to_anchor=(0.9, 0.9))
        plt.tight_layout(rect=[0, 0, 1, 0.96])

        buf = io.BytesIO()
        plt.savefig(buf, format='png', bbox_inches='tight')
        plt.close(fig)
        buf.seek(0)
        plot_image = base64.b64encode(buf.read()).decode('utf-8')

        response = {
            'results': {
                'demand_curve': demand_curve.to_dict('records'),
                'optimal_price': optimal_price,
                'max_revenue': max_revenue,
            },
            'plot': f"data:image/png;base64,{plot_image}",
        }

        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
