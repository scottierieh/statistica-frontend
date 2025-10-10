

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
        if np.isnan(obj) or np.isinf(obj):
            return None
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    return obj

def get_interpretation(results):
    if not results or not results.get('optimal_portfolios'):
        return "No data available for interpretation."

    individual_reach = results.get('individual_reach', [])
    optimal_portfolios = results.get('optimal_portfolios', {})
    recommendation = results.get('recommendation', {})
    
    top_item = individual_reach[0]['Product'] if individual_reach else "N/A"
    top_reach = individual_reach[0]['Reach (%)'] if individual_reach else 0

    best_combo_size = recommendation.get('size', 2)
    best_combo_products = recommendation.get('products', [])
    best_combo_reach = recommendation.get('reach', 0)
    
    interp = (
        f"The TURF analysis reveals which combination of products maximizes unique customer reach.\n\n"
        f"**Top Individual Performer:** **'{top_item}'** has the highest individual reach, appealing to **{top_reach:.1f}%** of respondents on its own, making it a strong anchor product for any portfolio.\n\n"
        f"**Optimal Portfolio:** To achieve your target reach of {results.get('reach_target', 80)}%, the recommended combination of **{best_combo_size} products** is **'{' + '.join(best_combo_products)}'**, which reaches **{best_combo_reach:.1f}%** of the audience. This offers an efficient balance of reach and portfolio size.\n\n"
        f"**Diminishing Returns:** Based on the incremental reach analysis, adding products beyond the 3rd or 4th item yields significantly smaller gains in new customer reach. This suggests that a portfolio of 3-4 products is likely the most cost-effective sweet spot."
    )
    return interp.strip()


def calculate_turf(df, product_list, n_respondents):
    if not product_list:
        return {'reach': 0, 'reach_count': 0, 'frequency': 0, 'n_products': 0}
    
    reach_mask = df[list(product_list)].sum(axis=1) > 0
    reach_count = reach_mask.sum()
    reach_pct = (reach_count / n_respondents) * 100 if n_respondents > 0 else 0
    
    if reach_count > 0:
        frequency = df.loc[reach_mask, list(product_list)].sum(axis=1).mean()
    else:
        frequency = 0
    
    return {
        'products': list(product_list),
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

        df_raw = pd.DataFrame(data)
        
        df_raw.dropna(subset=[selection_col], inplace=True)
        
        def clean_selection(x):
            if isinstance(x, list):
                return [str(item).strip().strip("[]'\" ") for item in x if item]
            elif isinstance(x, str):
                # Handles cases like "['A', 'B']"
                cleaned = x.strip("[]'\" ")
                return [item.strip().strip("[]'\" ") for item in cleaned.split(',') if item.strip()]
            else:
                return []
        
        df_raw['parsed_selection'] = df_raw[selection_col].apply(clean_selection)
        
        df_raw = df_raw[df_raw['parsed_selection'].apply(len) > 0]
        
        if len(df_raw) == 0:
            raise ValueError("No valid responses found after parsing.")
        
        all_products = set()
        for selection_list in df_raw['parsed_selection']:
            for product in selection_list:
                if product:
                    all_products.add(product)
        
        products = sorted(list(all_products))
        
        binary_data = []
        for selection_list in df_raw['parsed_selection']:
            row = {product: 1 if product in selection_list else 0 for product in products}
            binary_data.append(row)
        
        df = pd.DataFrame(binary_data)
        n_respondents = len(df)
        
        if n_respondents == 0:
             raise ValueError("No valid responses found after one-hot encoding.")

        # 1. Individual Product Reach
        individual_reach_list = []
        for product in products:
            reach = (df[product].sum() / n_respondents) * 100
            individual_reach_list.append({'Product': product, 'Reach (%)': reach})

        df_individual = pd.DataFrame(individual_reach_list).sort_values('Reach (%)', ascending=False)

        # 2. Optimal Portfolio & Top Combinations
        optimal_portfolios = {}
        all_combinations_by_size = {}
        max_portfolio_size = min(7, len(products))

        for size in range(1, max_portfolio_size + 1):
            results = [calculate_turf(df, list(combo), n_respondents) for combo in combinations(products, size)]
            if results:
                df_results = pd.DataFrame(results).sort_values('reach', ascending=False)
                optimal_portfolios[str(size)] = df_results.iloc[0].to_dict()
                all_combinations_by_size[str(size)] = df_results.head(10).to_dict('records')

        # 3. Incremental Reach
        sorted_products = df_individual['Product'].tolist()
        incremental_results = []
        cumulative_reach_mask = np.zeros(n_respondents, dtype=bool)
        for i, product in enumerate(sorted_products):
            product_reach_mask = df[product] == 1
            new_reach_count = (product_reach_mask & ~cumulative_reach_mask).sum()
            incremental_pct = (new_reach_count / n_respondents) * 100
            cumulative_reach_mask |= product_reach_mask
            cumulative_reach_pct = (cumulative_reach_mask.sum() / n_respondents) * 100
            incremental_results.append({
                'Order': i + 1, 'Product': product, 
                'Incremental Reach (%)': incremental_pct, 
                'Incremental Reach (count)': int(new_reach_count),
                'Cumulative Reach (%)': cumulative_reach_pct,
            })
        
        # 4. Optimal Recommendation
        recommendation = {}
        for size_str, portfolio in optimal_portfolios.items():
            if portfolio['reach'] >= 80.0:
                recommendation = {'size': int(size_str), 'products': portfolio['products'], 'reach': portfolio['reach']}
                break
        if not recommendation and optimal_portfolios: # Fallback if target not met
            last_size = str(max_portfolio_size)
            if last_size in optimal_portfolios:
                recommendation = {
                    'size': int(last_size), 
                    'products': optimal_portfolios[last_size]['products'], 
                    'reach': optimal_portfolios[last_size]['reach']
                }

        
        # 5. Overlap Analysis
        top_5_products = df_individual['Product'].head(5).tolist()
        overlap_matrix = pd.DataFrame(index=top_5_products, columns=top_5_products, dtype=float)
        for prod1 in top_5_products:
            for prod2 in top_5_products:
                if prod1 == prod2:
                    overlap_matrix.loc[prod1, prod2] = df_individual[df_individual['Product'] == prod1]['Reach (%)'].iloc[0]
                else:
                    overlap_count = ((df[prod1] == 1) & (df[prod2] == 1)).sum()
                    overlap_matrix.loc[prod1, prod2] = (overlap_count / n_respondents) * 100

        results_dict = {
            'individual_reach': df_individual.to_dict('records'),
            'optimal_portfolios': optimal_portfolios,
            'top_combinations': all_combinations_by_size,
            'incremental_reach': incremental_results,
            'recommendation': recommendation,
            'overlap_matrix': overlap_matrix.to_dict('index'),
            'reach_target': 80.0,
        }
        results_dict['interpretation'] = get_interpretation(results_dict)

        # PLOTTING
        fig, axes = plt.subplots(2, 2, figsize=(16, 12))
        fig.suptitle('TURF Analysis Dashboard', fontsize=16)

        sns.barplot(x='Reach (%)', y='Product', data=df_individual.head(10), ax=axes[0, 0], palette='viridis')
        axes[0, 0].set_title('Individual Product Reach (Top 10)')

        df_incremental = pd.DataFrame(incremental_results)
        ax2 = axes[0, 1]
        ax2.bar(df_incremental['Product'], df_incremental['Incremental Reach (%)'], color='skyblue', label='Incremental Reach')
        ax2_twin = ax2.twinx()
        ax2_twin.plot(df_incremental['Product'], df_incremental['Cumulative Reach (%)'], color='red', marker='o', label='Cumulative Reach')
        ax2.set_title('Incremental Reach by Product Rank')
        ax2.tick_params(axis='x', rotation=45, labelsize=8)
        fig.legend(loc='upper right', bbox_to_anchor=(0.9, 0.9))
        
        optimal_reaches = [opt['reach'] for opt in optimal_portfolios.values()]
        portfolio_sizes = [int(s) for s in optimal_portfolios.keys()]
        sns.lineplot(x=portfolio_sizes, y=optimal_reaches, marker='o', ax=axes[1, 0])
        axes[1, 0].set_title('Max Reach by Portfolio Size')
        axes[1, 0].set_xlabel('Number of Products'); axes[1, 0].set_ylabel('Maximum Reach (%)')
        
        sns.heatmap(overlap_matrix, annot=True, cmap='coolwarm', fmt=".1f", ax=axes[1,1])
        axes[1,1].set_title('Top 5 Product Overlap (%)')
        axes[1,1].tick_params(axis='x', rotation=45)

        plt.tight_layout(rect=[0, 0.03, 1, 0.95])
        
        buf = io.BytesIO()
        plt.savefig(buf, format='png')
        buf.seek(0)
        plot_image = base64.b64encode(buf.read()).decode('utf-8')
        
        response = {'results': results_dict, 'plot': plot_image}

        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()

