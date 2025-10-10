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

    individual_reach = results['individual_reach']
    optimal_portfolios = results['optimal_portfolios']

    top_item = individual_reach[0]['Product']
    top_reach = individual_reach[0]['Reach (%)']
    
    best_combo_size = '2'
    if '3' in optimal_portfolios:
        best_combo_size = '3'
    elif '2' in optimal_portfolios:
         best_combo_size = '2'

    best_combo = optimal_portfolios[best_combo_size]['combination']
    best_combo_reach = optimal_portfolios[best_combo_size]['reach']
    
    interpretation = (
        f"The TURF analysis reveals which combination of products maximizes unique customer reach.\n\n"
        f"**Top Individual Performer:** **'{top_item}'** has the highest individual reach, appealing to **{top_reach:.1f}%** of respondents on its own.\n\n"
        f"**Optimal Combination:** The combination of **'{best_combo}'** provides the highest reach for a small portfolio, reaching **{best_combo_reach:.1f}%** of the audience. This suggests a strong starting point for a product line.\n\n"
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
        'combination': ' + '.join(product_list),  # Clean string format
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

        # Data preprocessing: Handle selection data
        df_raw = pd.DataFrame(data)
        
        # Debug: Print first row to see structure
        if len(df_raw) > 0:
            print(f"DEBUG - First row type: {type(df_raw[selection_col].iloc[0])}", file=sys.stderr)
            print(f"DEBUG - First row value: {df_raw[selection_col].iloc[0]}", file=sys.stderr)
        
        df_raw.dropna(subset=[selection_col], inplace=True)
        
        # The selection should already be a list from JSON parsing
        # Just ensure it's clean
        def clean_selection(x):
            if isinstance(x, list):
                return [str(item).strip() for item in x if item]
            elif isinstance(x, str):
                return [x.strip()] if x.strip() else []
            else:
                return []
        
        df_raw['parsed_selection'] = df_raw[selection_col].apply(clean_selection)
        
        # Filter out empty selections
        df_raw = df_raw[df_raw['parsed_selection'].apply(len) > 0]
        
        if len(df_raw) == 0:
            raise ValueError("No valid responses found after parsing.")
        
        # Get all unique products
        all_products = set()
        for products_list in df_raw['parsed_selection']:
            # Clean each product name
            for product in products_list:
                # Remove any extra quotes, brackets, or special characters
                cleaned = str(product).strip().strip("[]'\"")
                if cleaned:
                    all_products.add(cleaned)
        
        products = sorted(list(all_products))
        
        print(f"DEBUG - Found {len(products)} unique products:", file=sys.stderr)
        for p in products[:5]:
            print(f"  - {p}", file=sys.stderr)
        
        # Build one-hot encoded dataframe
        binary_data = []
        for products_list in df_raw['parsed_selection']:
            # Clean product names in the selection list
            cleaned_selection = [str(p).strip().strip("[]'\"") for p in products_list]
            row = {product: 1 if product in cleaned_selection else 0 for product in products}
            binary_data.append(row)
        
        df = pd.DataFrame(binary_data)
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
        top_combinations = {}  # Store top 10 for each size
        max_portfolio_size = min(5, len(products))
        
        for portfolio_size in range(1, max_portfolio_size + 1):
            results = []
            for combo in combinations(products, portfolio_size):
                turf_result = calculate_turf(df, list(combo))
                results.append(turf_result)
            
            if results:
                df_results = pd.DataFrame(results)
                df_results_sorted = df_results.sort_values('reach', ascending=False)
                
                # Store best combination for this size
                best_reach = df_results_sorted.iloc[0].to_dict()
                optimal_portfolios[str(portfolio_size)] = best_reach
                
                # Store top 10 combinations for this size
                top_combinations[str(portfolio_size)] = df_results_sorted.head(10).to_dict('records')

        # 3. Incremental Reach Analysis
        sorted_products = df_individual['Product'].tolist()
        
        print(f"DEBUG - Sorted products for incremental: {sorted_products[:3]}", file=sys.stderr)
        
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
                'Incremental Reach (%)': incremental_pct,
                'Incremental Reach (count)': int(incremental_reach_count),
                'Cumulative Reach (%)': cumulative_reach_pct,
            })
        
        df_incremental = pd.DataFrame(incremental_results)

        # 4. Recommendation: Find optimal portfolio size (where marginal gain drops below threshold)
        recommendation = {}
        if '3' in optimal_portfolios:
            recommendation = {
                'size': 3,
                'products': optimal_portfolios['3']['combination'].split(' + '),
                'reach': optimal_portfolios['3']['reach']
            }
        elif '2' in optimal_portfolios:
            recommendation = {
                'size': 2,
                'products': optimal_portfolios['2']['combination'].split(' + '),
                'reach': optimal_portfolios['2']['reach']
            }

        # Prepare results dictionary
        results_dict = {
            'individual_reach': df_individual.to_dict('records'),
            'optimal_portfolios': optimal_portfolios,
            'top_combinations': top_combinations,
            'incremental_reach': df_incremental.to_dict('records'),
            'recommendation': recommendation,
            'overlap_matrix': {},  # Placeholder for future enhancement
            'reach_target': 80.0,  # Default target
        }
        results_dict['interpretation'] = get_interpretation(results_dict)

        # 5. Visualization
        fig, axes = plt.subplots(2, 2, figsize=(16, 12))
        fig.suptitle('TURF Analysis Results', fontsize=16, fontweight='bold')

        # Individual Reach
        sns.barplot(x='Reach (%)', y='Product', data=df_individual, ax=axes[0, 0], palette='viridis')
        axes[0, 0].set_title('Individual Product Reach', fontsize=12, fontweight='bold')
        axes[0, 0].set_xlabel('Reach (%)')

        # Incremental Reach
        ax2 = axes[0, 1]
        bars = ax2.bar(range(len(df_incremental)), df_incremental['Incremental Reach (%)'], 
                       color='skyblue', label='Incremental Reach', alpha=0.7)
        ax2.set_xticks(range(len(df_incremental)))
        ax2.set_xticklabels(df_incremental['Product'], rotation=45, ha='right')
        
        ax2_twin = ax2.twinx()
        ax2_twin.plot(range(len(df_incremental)), df_incremental['Cumulative Reach (%)'], 
                      color='red', marker='o', linewidth=2, markersize=8, label='Cumulative Reach')
        
        ax2.set_title('Incremental Reach by Product Rank', fontsize=12, fontweight='bold')
        ax2.set_xlabel('Product (Ranked by Individual Reach)')
        ax2.set_ylabel('Incremental Reach (%)', color='skyblue')
        ax2_twin.set_ylabel('Cumulative Reach (%)', color='red')
        
        lines1, labels1 = ax2.get_legend_handles_labels()
        lines2, labels2 = ax2_twin.get_legend_handles_labels()
        ax2.legend(lines1 + lines2, labels1 + labels2, loc='upper left')

        # Optimal Portfolio Reach
        portfolio_sizes_str = sorted(optimal_portfolios.keys(), key=int)
        portfolio_sizes_int = [int(s) for s in portfolio_sizes_str]
        optimal_reaches = [optimal_portfolios[size]['reach'] for size in portfolio_sizes_str]
        
        axes[1, 0].plot(portfolio_sizes_int, optimal_reaches, marker='o', linewidth=2, 
                       markersize=10, color='#2E86AB')
        axes[1, 0].set_title('Max Reach by Portfolio Size', fontsize=12, fontweight='bold')
        axes[1, 0].set_xlabel('Number of Products in Portfolio')
        axes[1, 0].set_ylabel('Maximum Reach (%)')
        axes[1, 0].grid(True, alpha=0.3)
        
        # Reach vs Frequency
        optimal_freqs = [optimal_portfolios[size]['frequency'] for size in portfolio_sizes_str]
        scatter = axes[1, 1].scatter(optimal_reaches, optimal_freqs, 
                                     c=portfolio_sizes_int, cmap='viridis', 
                                     s=200, alpha=0.7, edgecolors='black')
        
        for i, size in enumerate(portfolio_sizes_int):
            axes[1, 1].annotate(f'{size}', 
                               (optimal_reaches[i], optimal_freqs[i]),
                               fontsize=10, fontweight='bold', ha='center', va='center')
        
        axes[1, 1].set_title('Reach vs. Frequency Trade-off', fontsize=12, fontweight='bold')
        axes[1, 1].set_xlabel('Reach (%)')
        axes[1, 1].set_ylabel('Average Frequency')
        axes[1, 1].grid(True, alpha=0.3)

        plt.tight_layout(rect=[0, 0.03, 1, 0.96])
        
        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=150, bbox_inches='tight')
        buf.seek(0)
        plot_image = base64.b64encode(buf.read()).decode('utf-8')
        plt.close()
        
        response = {
            'results': results_dict,
            'plot': plot_image,
        }

        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
    