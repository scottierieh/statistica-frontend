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
        demographic_data = payload.get('demographics', [])  # Additional demographic data

        if not data or not selection_col:
            raise ValueError("Missing 'data' or 'selectionCol'")

        # Data preprocessing
        df_raw = pd.DataFrame(data)
        
        # Add demographic data if provided
        if demographic_data and len(demographic_data) == len(df_raw):
            df_demographics = pd.DataFrame(demographic_data)
            df_raw = pd.concat([df_raw, df_demographics], axis=1)
        
        df_raw.dropna(subset=[selection_col], inplace=True)
        
        def clean_selection(x):
            if isinstance(x, list):
                return [str(item).strip() for item in x if item]
            elif isinstance(x, str):
                return [x.strip()] if x.strip() else []
            else:
                return []
        
        df_raw['parsed_selection'] = df_raw[selection_col].apply(clean_selection)
        df_raw = df_raw[df_raw['parsed_selection'].apply(len) > 0]
        
        if len(df_raw) == 0:
            raise ValueError("No valid responses found after parsing.")
        
        # Get all unique products
        all_products = set()
        for products_list in df_raw['parsed_selection']:
            for product in products_list:
                cleaned = str(product).strip().strip("[]'\"")
                if cleaned:
                    all_products.add(cleaned)
        
        products = sorted(list(all_products))
        
        # Build binary dataframe
        binary_data = []
        for products_list in df_raw['parsed_selection']:
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
            'Reach (%)': [individual_reach[p] for p in products],
            'Count': [int(df[p].sum()) for p in products]
        }).sort_values('Reach (%)', ascending=False)

        # 2. Optimal Portfolio Analysis
        optimal_portfolios = {}
        top_combinations = {}
        max_portfolio_size = min(5, len(products))
        
        for portfolio_size in range(1, max_portfolio_size + 1):
            results = []
            for combo in combinations(products, portfolio_size):
                turf_result = calculate_turf(df, list(combo), n_respondents)
                results.append(turf_result)
            
            if results:
                df_results = pd.DataFrame(results)
                df_results_sorted = df_results.sort_values('reach', ascending=False)
                
                best_reach = df_results_sorted.iloc[0].to_dict()
                optimal_portfolios[str(portfolio_size)] = best_reach
                top_combinations[str(portfolio_size)] = df_results_sorted.head(10).to_dict('records')

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
                'Incremental Reach (%)': incremental_pct,
                'Incremental Reach (count)': int(incremental_reach_count),
                'Cumulative Reach (%)': cumulative_reach_pct,
            })
        
        df_incremental = pd.DataFrame(incremental_results)

        # 4. NEW: Overlap Matrix
        overlap_matrix = pd.DataFrame(index=products, columns=products, dtype=float)
        for prod1 in products:
            for prod2 in products:
                 if prod1 == prod2:
                    overlap_matrix.loc[prod1, prod2] = 100.0
                 else:
                    overlap_count = ((df[prod1] == 1) & (df[prod2] == 1)).sum()
                    prod1_total = df[prod1].sum()
                    overlap_pct = (overlap_count / prod1_total) * 100 if prod1_total > 0 else 0
                    overlap_matrix.loc[prod1, prod2] = overlap_pct

        # 5. NEW: Frequency Distribution
        selections_per_respondent = df[products].sum(axis=1)
        frequency_distribution = []
        for i in range(len(products) + 1):
            count = (selections_per_respondent == i).sum()
            percentage = (count / n_respondents) * 100
            frequency_distribution.append({
                'n_products': i,
                'count': int(count),
                'percentage': float(percentage)
            })

        # 6. NEW: Product Contribution Scores
        product_contribution = {}
        for product in products:
            appears_in_top = 0
            total_reach_contribution = 0
            for size in range(2, max_portfolio_size + 1):
                if str(size) in top_combinations:
                    for combo_info in top_combinations[str(size)]:
                        if product in combo_info['combination']:
                            appears_in_top += 1
                            total_reach_contribution += combo_info['reach']
            
            avg_contribution = total_reach_contribution / appears_in_top if appears_in_top > 0 else 0
            product_contribution[product] = {
                'appears_in_combinations': int(appears_in_top),
                'avg_reach_contribution': float(avg_contribution),
                'importance_score': float(avg_contribution * appears_in_top / 100)
            }
        
        # 7. NEW: Reach Efficiency Metrics
        efficiency_metrics = []
        portfolio_sizes = sorted([int(k) for k in optimal_portfolios.keys()])
        for i, size in enumerate(portfolio_sizes):
            size_str = str(size)
            reach = optimal_portfolios[size_str]['reach']
            if i > 0:
                prev_size = portfolio_sizes[i-1]
                prev_reach = optimal_portfolios[str(prev_size)]['reach']
                incremental_reach = reach - prev_reach
                efficiency = incremental_reach / (size - prev_size)
            else:
                efficiency = reach / size
            efficiency_metrics.append({
                'portfolio_size': size,
                'reach': float(reach),
                'efficiency': float(efficiency),
                'reach_per_product': float(reach / size)
            })

        # 8. NEW: Demographic Segment Analysis
        demographic_cols = [col for col in df_raw.columns 
                           if col not in [selection_col, 'parsed_selection'] 
                           and df_raw[col].dtype == 'object']
        segment_analysis = {}
        for col in demographic_cols:
            if df_raw[col].isna().all(): continue
            
            segment_results_col = {}
            unique_values = df_raw[col].dropna().unique()
            
            for value in unique_values:
                segment_mask = (df_raw[col] == value).values
                df_segment = df[segment_mask]
                
                if len(df_segment) < 10: continue
                
                segment_reach = {p: (df_segment[p].sum() / len(df_segment)) * 100 for p in products}
                sorted_products = sorted(segment_reach.items(), key=lambda x: x[1], reverse=True)[:3]
                
                best_combo, best_reach = None, 0
                for combo in combinations(products, min(3, len(products))):
                    turf = calculate_turf(df_segment, list(combo), len(df_segment))
                    if turf['reach'] > best_reach:
                        best_reach = turf['reach']
                        best_combo = combo
                
                segment_results_col[str(value)] = {
                    'size': int(len(df_segment)),
                    'top_products': [{'product': p, 'reach': float(r)} for p, r in sorted_products],
                    'optimal_combination': list(best_combo) if best_combo else [],
                    'optimal_reach': float(best_reach),
                    'avg_frequency': float(df_segment[products].sum(axis=1).mean())
                }
            if segment_results_col:
                segment_analysis[col] = segment_results_col
        
        # 9. Recommendation
        recommendation = {}
        for size_str, portfolio in sorted(optimal_portfolios.items(), key=lambda item: int(item[0])):
            if portfolio['reach'] >= 80.0:
                recommendation = {'size': int(size_str), 'products': portfolio['products'], 'reach': portfolio['reach'], 'frequency': portfolio['frequency']}
                break
        if not recommendation and optimal_portfolios:
            last_size = str(max_portfolio_size)
            if last_size in optimal_portfolios:
                recommendation = {
                    'size': int(last_size), 
                    'products': optimal_portfolios[last_size]['products'], 
                    'reach': optimal_portfolios[last_size]['reach'],
                    'frequency': optimal_portfolios[last_size]['frequency']
                }

        
        # Prepare results dictionary
        results_dict = {
            'individual_reach': df_individual.to_dict('records'),
            'optimal_portfolios': optimal_portfolios,
            'top_combinations': top_combinations,
            'incremental_reach': df_incremental.to_dict('records'),
            'recommendation': recommendation,
            'overlap_matrix': overlap_matrix.to_dict('index'),
            'frequency_distribution': frequency_distribution,
            'product_contribution': product_contribution,
            'efficiency_metrics': efficiency_metrics,
            'segment_analysis': segment_analysis,
            'reach_target': 80.0,
            'total_respondents': int(n_respondents)
        }
        results_dict['interpretation'] = get_interpretation(results_dict)

        # PLOTTING
        fig, axes = plt.subplots(3, 2, figsize=(16, 24))
        fig.suptitle('TURF Analysis Dashboard', fontsize=18, fontweight='bold')

        # Individual Reach
        sns.barplot(x='Reach (%)', y='Product', data=df_individual, ax=axes[0, 0], palette='viridis')
        axes[0, 0].set_title('Individual Product Reach', fontsize=13, fontweight='bold')

        # Incremental Reach
        ax2 = axes[0, 1]
        bars = ax2.bar(df_incremental['Product'], df_incremental['Incremental Reach (%)'], color='skyblue', label='Incremental Reach', alpha=0.7)
        ax2_twin = ax2.twinx()
        ax2_twin.plot(df_incremental['Product'], df_incremental['Cumulative Reach (%)'], color='red', marker='o', label='Cumulative Reach')
        ax2.set_title('Incremental Reach by Product Rank', fontsize=13, fontweight='bold')
        ax2.tick_params(axis='x', rotation=45, labelsize=9)
        fig.legend(loc='upper right', bbox_to_anchor=(0.9, 0.95))
        
        # Optimal Portfolio Reach
        portfolio_sizes = [int(s) for s in optimal_portfolios.keys()]
        optimal_reaches = [opt['reach'] for opt in optimal_portfolios.values()]
        axes[1, 0].plot(portfolio_sizes, optimal_reaches, marker='o', color='#2E86AB', linewidth=2)
        axes[1, 0].set_title('Max Reach by Portfolio Size', fontsize=13, fontweight='bold')
        axes[1, 0].set_xlabel('Number of Products'); axes[1, 0].set_ylabel('Maximum Reach (%)')
        axes[1, 0].grid(True, alpha=0.3)
        
        # Overlap Matrix
        top_5_products = df_individual['Product'].head(5).tolist()
        overlap_matrix_top5 = overlap_matrix.loc[top_5_products, top_5_products]
        sns.heatmap(overlap_matrix_top5, annot=True, cmap='coolwarm', fmt=".1f", ax=axes[1, 1])
        axes[1, 1].set_title('Top 5 Product Overlap (%)', fontsize=13, fontweight='bold')
        
        # Frequency Distribution
        freq_df = pd.DataFrame(frequency_distribution)
        freq_df = freq_df[freq_df['n_products'] > 0]
        sns.barplot(x='n_products', y='percentage', data=freq_df, ax=axes[2, 0], color='#a67b70')
        axes[2, 0].set_title('Number of Products Chosen', fontsize=13, fontweight='bold')
        axes[2, 0].set_xlabel('Number of Products'); axes[2, 0].set_ylabel('% of Respondents')
        
        # Reach vs Frequency
        reach_freq_data = [
            {'size': s, 'reach': v['reach'], 'frequency': v['frequency']}
            for s, v in optimal_portfolios.items()
        ]
        sns.scatterplot(x='reach', y='frequency', size='size', data=pd.DataFrame(reach_freq_data), ax=axes[2, 1], hue='size', palette='viridis', sizes=(50, 200))
        axes[2, 1].set_title('Reach vs. Frequency Trade-off', fontsize=13, fontweight='bold')
        axes[2, 1].set_xlabel('Reach (%)'); axes[2, 1].set_ylabel('Average Frequency')
        axes[2, 1].legend(title='Portfolio Size')

        plt.tight_layout(rect=[0, 0.02, 1, 0.98])
        
        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=120, bbox_inches='tight')
        buf.seek(0)
        plot_image = base64.b64encode(buf.read()).decode('utf-8')
        plt.close()
        
        response = {'results': results_dict, 'plot': plot_image}

        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
