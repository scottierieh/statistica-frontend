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

# 한글 폰트 설정
try:
    plt.rcParams['font.family'] = 'Malgun Gothic'
    plt.rcParams['axes.unicode_minus'] = False
except:
    pass

def _to_native_type(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif pd.isna(obj):
        return None
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
        
        # Calculate demand drop (cliff detection)
        demand_curve['demand_drop'] = -demand_curve['likelihood'].diff()
        demand_curve['demand_drop'] = demand_curve['demand_drop'].fillna(0)
        
        # Find optimal price point (that maximizes revenue)
        optimal_price_row = demand_curve.loc[demand_curve['revenue'].idxmax()]
        optimal_revenue_price = optimal_price_row[price_col]
        max_revenue = optimal_price_row['revenue']
        
        results_dict = {
            'demand_curve': demand_curve.to_dict('records'),
            'optimal_revenue_price': optimal_revenue_price,
            'max_revenue': max_revenue,
        }

        # Find "cliff" price where demand drops most sharply
        cliff_price_row = demand_curve.sort_values('demand_drop', ascending=False).iloc[0]
        results_dict['cliff_price'] = cliff_price_row[price_col]
        
        # Find acceptable price range (e.g., where revenue is >= 90% of max)
        acceptable_range_df = demand_curve[demand_curve['revenue'] >= 0.9 * max_revenue]
        if not acceptable_range_df.empty:
            results_dict['acceptable_range'] = [acceptable_range_df[price_col].min(), acceptable_range_df[price_col].max()]
        else:
            results_dict['acceptable_range'] = None

        # Calculate profit if cost is provided
        if unit_cost is not None:
            demand_curve['profit_margin'] = demand_curve[price_col] - unit_cost
            demand_curve['profit'] = demand_curve['profit_margin'] * demand_curve['likelihood']
            if not demand_curve.empty and not demand_curve['profit'].isnull().all():
                optimal_profit_row = demand_curve.loc[demand_curve['profit'].idxmax()]
                results_dict['optimal_profit_price'] = optimal_profit_row[price_col]
                results_dict['max_profit'] = optimal_profit_row['profit']
            
            results_dict['demand_curve'] = demand_curve.to_dict('records')

        # Calculate price elasticity
        demand_curve_sorted = demand_curve.sort_values(price_col)
        prices = demand_curve_sorted[price_col].values
        quantities = demand_curve_sorted['likelihood'].values
        
        elasticities = []
        for i in range(1, len(prices)):
            price_change = (prices[i] - prices[i-1]) / prices[i-1]
            quantity_change = (quantities[i] - quantities[i-1]) / quantities[i-1]
            
            if price_change != 0 and not np.isnan(quantity_change):
                elasticity = quantity_change / price_change
                elasticities.append({
                    'price_from': prices[i-1],
                    'price_to': prices[i],
                    'elasticity': elasticity
                })
        
        results_dict['price_elasticity'] = elasticities

        # --- Plotting ---
        fig, axes = plt.subplots(2, 2, figsize=(14, 10))

        # 1. Demand Curve with acceptable range
        ax1 = axes[0, 0]
        ax1.plot(demand_curve[price_col], demand_curve['likelihood'], 
                color='tab:blue', marker='o', linewidth=2, label='Demand Curve')
        ax1.axvline(x=optimal_revenue_price, color='green', linestyle='--', linewidth=2,
                   label=f'Optimal Revenue Price: ${optimal_revenue_price:.2f}')
        ax1.axvline(x=results_dict['cliff_price'], color='red', linestyle=':', linewidth=2,
                   label=f'Cliff Price: ${results_dict["cliff_price"]:.2f}')
        
        if results_dict['acceptable_range']:
            ax1.axvspan(results_dict['acceptable_range'][0], results_dict['acceptable_range'][1], 
                       alpha=0.2, color='green', label='Acceptable Range (≥90% max revenue)')
        
        ax1.set_xlabel('Price', fontweight='bold')
        ax1.set_ylabel('Purchase Likelihood', fontweight='bold')
        ax1.set_title('Demand Curve (Purchase Likelihood by Price)', fontweight='bold')
        ax1.legend(loc='best', fontsize=8)
        ax1.grid(True, alpha=0.3)

        # 2. Revenue and Profit Curves
        ax2 = axes[0, 1]
        ax2.plot(demand_curve[price_col], demand_curve['revenue'], 
                color='tab:red', marker='x', linewidth=2, linestyle='--', label='Revenue Curve')
        ax2.scatter([optimal_revenue_price], [max_revenue], 
                   s=200, color='red', zorder=5, marker='*', label='Max Revenue')
        
        if 'profit' in demand_curve.columns:
            ax2.plot(demand_curve[price_col], demand_curve['profit'], 
                    color='purple', marker='+', linewidth=2, linestyle='--', label='Profit Curve')
            if 'optimal_profit_price' in results_dict:
                ax2.axvline(x=results_dict['optimal_profit_price'], color='purple', linestyle=':', 
                           linewidth=2, label=f'Optimal Profit Price: ${results_dict["optimal_profit_price"]:.2f}')
        
        ax2.set_xlabel('Price', fontweight='bold')
        ax2.set_ylabel('Revenue / Profit Index', fontweight='bold')
        ax2.set_title('Revenue & Profit Curves', fontweight='bold')
        ax2.legend(loc='best', fontsize=8)
        ax2.grid(True, alpha=0.3)

        # 3. Demand Drop (Cliff Analysis)
        ax3 = axes[1, 0]
        demand_drops = demand_curve['demand_drop'].fillna(0)
        colors = ['red' if p == results_dict['cliff_price'] else 'gray' for p in demand_curve[price_col]]
        bars = ax3.bar(range(len(demand_curve)), demand_drops, color=colors, alpha=0.7, edgecolor='black')
        
        ax3.set_xlabel('Price Point', fontweight='bold')
        ax3.set_ylabel('Demand Drop', fontweight='bold')
        ax3.set_title('Demand Drop Analysis (Cliff Detection)', fontweight='bold')
        ax3.set_xticks(range(len(demand_curve)))
        ax3.set_xticklabels([f'${p:.0f}' for p in demand_curve[price_col]], rotation=45, ha='right')
        ax3.axhline(0, color='black', linewidth=0.8)
        ax3.grid(True, axis='y', alpha=0.3)

        # 4. Price Elasticity
        ax4 = axes[1, 1]
        if elasticities:
            elast_values = [e['elasticity'] for e in elasticities]
            elast_labels = [f"${e['price_from']:.0f}-${e['price_to']:.0f}" for e in elasticities]
            colors_elast = ['green' if e > -1 else 'red' for e in elast_values]
            
            ax4.barh(range(len(elast_values)), elast_values, color=colors_elast, alpha=0.7, edgecolor='black')
            ax4.set_yticks(range(len(elast_values)))
            ax4.set_yticklabels(elast_labels)
            ax4.set_xlabel('Price Elasticity', fontweight='bold')
            ax4.set_title('Price Elasticity by Range\n(Green: Inelastic |e|<1, Red: Elastic |e|>1)', fontweight='bold', fontsize=10)
            ax4.axvline(0, color='black', linewidth=1)
            ax4.axvline(-1, color='blue', linestyle='--', linewidth=1, alpha=0.5)
            ax4.grid(True, axis='x', alpha=0.3)
            
            for i, (val, label) in enumerate(zip(elast_values, elast_labels)):
                ax4.text(val, i, f' {val:.2f}', va='center', fontweight='bold', fontsize=8)
        else:
            ax4.text(0.5, 0.5, 'Insufficient data for elasticity', 
                    ha='center', va='center', transform=ax4.transAxes)
            ax4.axis('off')

        plt.suptitle('Gabor-Granger Price Analysis', fontsize=16, fontweight='bold')
        plt.tight_layout(rect=[0, 0, 1, 0.96])

        buf = io.BytesIO()
        plt.savefig(buf, format='png', bbox_inches='tight', dpi=100)
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
