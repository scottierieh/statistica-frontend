
import sys
import json
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from scipy import interpolate
import io
import base64
import warnings

warnings.filterwarnings('ignore')

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
        unit_cost = payload.get('unit_cost')
        if unit_cost is not None:
            unit_cost = float(unit_cost)

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
        optimal_revenue_price = optimal_price_row[price_col]
        max_revenue = optimal_price_row['revenue']
        
        results_dict = {
            'demand_curve': demand_curve.to_dict('records'),
            'optimal_revenue_price': optimal_revenue_price,
            'max_revenue': max_revenue,
        }

        # Calculate profit if cost is provided
        if unit_cost is not None:
            demand_curve['profit_margin'] = demand_curve[price_col] - unit_cost
            demand_curve['profit'] = demand_curve['profit_margin'] * demand_curve['likelihood']
            optimal_profit_row = demand_curve.loc[demand_curve['profit'].idxmax()]
            results_dict['optimal_profit_price'] = optimal_profit_row[price_col]
            results_dict['max_profit'] = optimal_profit_row['profit']
            # Re-fetch the demand curve records to include profit
            results_dict['demand_curve'] = demand_curve.to_dict('records')


        # Find "cliff" price where demand drops most sharply
        demand_curve['demand_drop'] = -demand_curve['likelihood'].diff()
        cliff_price_row = demand_curve.sort_values('demand_drop', ascending=False).iloc[0]
        results_dict['cliff_price'] = cliff_price_row[price_col]
        
        # Find acceptable price range (e.g., where revenue is >= 90% of max)
        acceptable_range_df = demand_curve[demand_curve['revenue'] >= 0.9 * max_revenue]
        if not acceptable_range_df.empty:
            results_dict['acceptable_range'] = [acceptable_range_df[price_col].min(), acceptable_range_df[price_col].max()]
        else:
            results_dict['acceptable_range'] = None

        # --- Plotting ---
        fig, ax1 = plt.subplots(figsize=(10, 6))

        # Demand Curve
        color1 = 'tab:blue'
        ax1.set_xlabel('Price')
        ax1.set_ylabel('Purchase Likelihood', color=color1)
        ax1.plot(demand_curve[price_col], demand_curve['likelihood'], color=color1, marker='o', label='Demand Curve')
        ax1.tick_params(axis='y', labelcolor=color1)
        ax1.axvline(x=optimal_revenue_price, color='green', linestyle=':', label=f'Optimal Revenue Price: ${optimal_revenue_price:.2f}')
        
        # Revenue Curve
        ax2 = ax1.twinx()
        color2 = 'tab:red'
        ax2.set_ylabel('Potential Revenue / Profit', color=color2)
        ax2.plot(demand_curve[price_col], demand_curve['revenue'], color=color2, marker='x', linestyle='--', label='Revenue Curve')
        ax2.tick_params(axis='y', labelcolor=color2)

        # Plot profit if available
        if 'profit' in demand_curve.columns:
            ax2.plot(demand_curve[price_col], demand_curve['profit'], color='purple', marker='+', linestyle='--', label='Profit Curve')
            if 'optimal_profit_price' in results_dict:
                ax2.axvline(x=results_dict['optimal_profit_price'], color='purple', linestyle=':', label=f'Optimal Profit Price: ${results_dict["optimal_profit_price"]:.2f}')
        
        fig.suptitle('Gabor-Granger Price Analysis', fontsize=16, fontweight='bold')
        lines, labels = ax1.get_legend_handles_labels()
        lines2, labels2 = ax2.get_legend_handles_labels()
        ax2.legend(lines + lines2, labels + labels2, loc='upper right')

        plt.tight_layout(rect=[0, 0, 1, 0.96])

        buf = io.BytesIO()
        plt.savefig(buf, format='png', bbox_inches='tight')
        plt.close(fig)
        buf.seek(0)
        plot_image = base64.b64encode(buf.read()).decode('utf-8')

        response = {
            'results': results_dict,
            'plot': f"data:image/png;base64,{plot_image}",
        }

        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()

