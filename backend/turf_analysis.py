

import sys
import json
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from itertools import combinations
import io
import base64

def _to_native_type(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        if np.isnan(obj):
            return None
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    return obj

def get_interpretation(results):
    if not results or not results.get('optimal_portfolios'):
        return "No data available for interpretation."

    individual_reach = results['individual_reach']
    optimal_portfolios = results['optimal_portfolios']

    top_item = ""
    top_reach = 0
    if individual_reach:
        top_item = individual_reach[0]['Product']
        top_reach = individual_reach[0]['Reach (%)']
    
    best_combo_size = '2'
    if '3' in optimal_portfolios:
        best_combo_size = '3'
    elif '2' in optimal_portfolios:
         best_combo_size = '2'

    best_combo_data = optimal_portfolios.get(best_combo_size)
    best_combo = best_combo_data['combination'] if best_combo_data else "N/A"
    best_combo_reach = best_combo_data['reach'] if best_combo_data else 0
    
    interpretation = (
        f"The TURF analysis reveals which combination of products maximizes unique customer reach.\n\n"
        f"**Top Individual Performer:** **'{top_item}'** has the highest individual reach, appealing to **{top_reach:.1f}%** of respondents on its own.\n\n"
        f"**Optimal Combination:** The combination of **'{best_combo}'** provides high reach for a small portfolio, reaching **{best_combo_reach:.1f}%** of the audience. This suggests a strong starting point for a product line.\n\n"
        f"**Strategic Recommendations:**\n"
        f"1. **Anchor Product:** '{top_item}' should be considered a core product due to its strong individual appeal.\n"
        f"2. **Line Optimization:** Focus on the combinations identified in the 'Optimal Portfolios' table to build product lines that efficiently maximize market coverage without significant overlap.\n"
        f"3. **Diminishing Returns:** Pay attention to the 'Incremental Reach' chart. If adding another product only adds a small percentage of new customers, it may not be cost-effective."
    )
    return interpretation.strip()

def calculate_turf(df, product_list):
    if not product_list:
        return {'reach': 0, 'reach_count': 0, 'frequency': 0}
    
    reach_mask = df[product_list].sum(axis=1) > 0
    reach_count = reach_mask.sum()
    reach_pct = (reach_count / len(df)) * 100
    
    if reach_count > 0:
        frequency = df.loc[reach_mask, product_list].sum(axis=1).mean()
    else:
        frequency = 0
    
    return {
        'products': product_list,
        'combination': ' + '.join(product_list),
        'reach': reach_pct,
        'reach_count': int(reach_count),
        'frequency': frequency,
        'n_products': len(product_list)
    }

def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        selection_col = payload.get('selectionCol')

        if not data or not selection_col:
            raise ValueError("Missing 'data' or 'selectionCol'")

        # Data preprocessing: One-hot encode the comma-separated selections
        df_raw = pd.DataFrame(data)
        df_raw.dropna(subset=[selection_col], inplace=True)
        
        s = df_raw[selection_col].str.get_dummies(sep=',')
        
        products = s.columns.tolist()
        df = s.copy()
        n_respondents = len(df)
        
        if n_respondents == 0:
             raise ValueError("No valid responses found.")

        # 1. Individual Product Reach
        individual_reach = {}
        for product in products:
            reach = (df[product].sum() / n_respondents) * 100
            individual_reach[product] = reach

        df_individual = pd.DataFrame({
            'Product': products,
            'Reach (%)': [individual_reach[p] for p in products]
        }).sort_values('Reach (%)', ascending=False)

        # 2. Optimal Portfolio Analysis
        optimal_portfolios = {}
        max_portfolio_size = min(5, len(products))
        for portfolio_size in range(1, max_portfolio_size + 1):
            results = []
            for combo in combinations(products, portfolio_size):
                turf_result = calculate_turf(df, list(combo))
                results.append(turf_result)
            
            if results:
                df_results = pd.DataFrame(results)
                best_reach = df_results.loc[df_results['reach'].idxmax()]
                optimal_portfolios[str(portfolio_size)] = best_reach.to_dict()

        # 3. Incremental Reach Analysis
        sorted_products = df_individual['Product'].tolist()
        incremental_results = []
        cumulative_reach_mask = np.zeros(n_respondents, dtype=bool)
        for i, product in enumerate(sorted_products):
            product_reach_mask = df[product] == 1
            new_reach_mask = product_reach_mask & ~cumulative_reach_mask
            incremental_reach_count = new_reach_mask.sum()
            incremental_pct = (incremental_reach_count / n_respondents) * 100
            
            cumulative_reach_mask |= product_reach_mask
            cumulative_reach_count = cumulative_reach_mask.sum()
            cumulative_reach_pct = (cumulative_reach_count / n_respondents) * 100
            
            incremental_results.append({
                'Order': i + 1,
                'Product': product,
                'Incremental Reach': incremental_pct,
                'Cumulative Reach': cumulative_reach_pct,
            })
        
        df_incremental = pd.DataFrame(incremental_results)

        # Prepare results dictionary
        results_dict = {
            'individual_reach': df_individual.to_dict('records'),
            'optimal_portfolios': optimal_portfolios,
            'incremental_reach': df_incremental.to_dict('records'),
        }
        results_dict['interpretation'] = get_interpretation(results_dict)

        # 4. Visualization
        fig, axes = plt.subplots(2, 2, figsize=(16, 12))
        fig.suptitle('TURF Analysis Results', fontsize=16)

        # Individual Reach
        sns.barplot(x='Reach (%)', y='Product', data=df_individual, ax=axes[0, 0], palette='viridis')
        axes[0, 0].set_title('Individual Product Reach')

        # Incremental Reach
        ax2 = axes[0, 1]
        ax2.bar(df_incremental['Product'], df_incremental['Incremental Reach'], color='skyblue', label='Incremental Reach')
        ax2_twin = ax2.twinx()
        ax2_twin.plot(df_incremental['Product'], df_incremental['Cumulative Reach'], color='red', marker='o', label='Cumulative Reach')
        ax2.set_title('Incremental Reach by Product Rank')
        ax2.tick_params(axis='x', rotation=45)
        fig.legend(loc='upper right', bbox_to_anchor=(0.9, 0.9))

        # Optimal Portfolio Reach
        portfolio_sizes_str = list(optimal_portfolios.keys())
        portfolio_sizes_int = [int(s) for s in portfolio_sizes_str]
        optimal_reaches = [optimal_portfolios[size]['reach'] for size in portfolio_sizes_str]
        sns.lineplot(x=portfolio_sizes_int, y=optimal_reaches, marker='o', ax=axes[1, 0])
        axes[1, 0].set_title('Max Reach by Portfolio Size')
        axes[1, 0].set_xlabel('Number of Products in Portfolio')
        axes[1, 0].set_ylabel('Maximum Reach (%)')
        
        # Reach vs Frequency
        optimal_freqs = [optimal_portfolios[size]['frequency'] for size in portfolio_sizes_str]
        sns.scatterplot(x=optimal_reaches, y=optimal_freqs, hue=portfolio_sizes_int, palette='viridis', s=150, ax=axes[1, 1])
        axes[1, 1].set_title('Reach vs. Frequency Trade-off')
        axes[1, 1].set_xlabel('Reach (%)')
        axes[1, 1].set_ylabel('Average Frequency')

        plt.tight_layout(rect=[0, 0.03, 1, 0.95])
        
        buf = io.BytesIO()
        plt.savefig(buf, format='png')
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
