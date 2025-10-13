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
        'combination': ' + '.join(product_list),
        'reach': reach_pct,
        'reach_count': int(reach_count),
        'frequency': frequency,
        'n_products': len(product_list)
    }

def calculate_overlap_matrix(df, products):
    """Calculate pairwise overlap percentages between products"""
    overlap_matrix = {}
    
    for prod1 in products:
        overlap_matrix[prod1] = {}
        for prod2 in products:
            if prod1 == prod2:
                overlap_matrix[prod1][prod2] = 100.0
            else:
                # Calculate overlap: % of prod1 buyers who also like prod2
                prod1_buyers = df[prod1] == 1
                if prod1_buyers.sum() > 0:
                    both_buyers = (df[prod1] == 1) & (df[prod2] == 1)
                    overlap_pct = (both_buyers.sum() / prod1_buyers.sum()) * 100
                    overlap_matrix[prod1][prod2] = float(overlap_pct)
                else:
                    overlap_matrix[prod1][prod2] = 0.0
    
    return overlap_matrix

def calculate_frequency_distribution(df, products):
    """Calculate distribution of how many products each respondent selected"""
    selections_per_respondent = df[products].sum(axis=1)
    
    distribution = []
    for i in range(len(products) + 1):
        count = (selections_per_respondent == i).sum()
        percentage = (count / len(df)) * 100
        distribution.append({
            'n_products': i,
            'count': int(count),
            'percentage': float(percentage)
        })
    
    return distribution

def calculate_product_contribution(df, products):
    """Calculate each product's contribution to various combinations"""
    contribution_scores = {}
    
    for product in products:
        # Count how many times this product appears in top combinations
        appears_in_top = 0
        total_reach_contribution = 0
        
        # Check 2-product combinations
        for combo in combinations(products, 2):
            if product in combo:
                turf = calculate_turf(df, list(combo))
                total_reach_contribution += turf['reach']
                appears_in_top += 1
        
        # Check 3-product combinations
        for combo in combinations(products, 3):
            if product in combo:
                turf = calculate_turf(df, list(combo))
                total_reach_contribution += turf['reach']
                appears_in_top += 1
        
        avg_contribution = total_reach_contribution / appears_in_top if appears_in_top > 0 else 0
        
        contribution_scores[product] = {
            'appears_in_combinations': int(appears_in_top),
            'avg_reach_contribution': float(avg_contribution),
            'importance_score': float(avg_contribution * appears_in_top / 100)  # Normalized score
        }
    
    return contribution_scores

def calculate_segment_analysis(df_raw, df, products, demographic_cols):
    """Analyze TURF results by demographic segments"""
    segment_results = {}
    
    for col in demographic_cols:
        if col not in df_raw.columns or df_raw[col].isna().all():
            continue
        
        segment_results[col] = {}
        unique_values = df_raw[col].dropna().unique()
        
        for value in unique_values:
            segment_mask = df_raw[col] == value
            df_segment = df[segment_mask]
            
            if len(df_segment) < 10:  # Skip small segments
                continue
            
            # Calculate top 3 products for this segment
            segment_reach = {}
            for product in products:
                reach = (df_segment[product].sum() / len(df_segment)) * 100
                segment_reach[product] = reach
            
            sorted_products = sorted(segment_reach.items(), key=lambda x: x[1], reverse=True)[:3]
            
            # Calculate optimal 3-product combination for segment
            best_combo = None
            best_reach = 0
            
            for combo in combinations(products, min(3, len(products))):
                turf = calculate_turf(df_segment, list(combo))
                if turf['reach'] > best_reach:
                    best_reach = turf['reach']
                    best_combo = combo
            
            segment_results[col][str(value)] = {
                'size': int(len(df_segment)),
                'top_products': [{'product': p, 'reach': float(r)} for p, r in sorted_products],
                'optimal_combination': list(best_combo) if best_combo else [],
                'optimal_reach': float(best_reach),
                'avg_frequency': float(df_segment[products].sum(axis=1).mean())
            }
    
    return segment_results

def calculate_reach_efficiency(optimal_portfolios):
    """Calculate efficiency metrics for different portfolio sizes"""
    efficiency_metrics = []
    
    portfolio_sizes = sorted([int(k) for k in optimal_portfolios.keys()])
    
    for i, size in enumerate(portfolio_sizes):
        size_str = str(size)
        reach = optimal_portfolios[size_str]['reach']
        
        # Calculate incremental efficiency
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
    
    return efficiency_metrics

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
                turf_result = calculate_turf(df, list(combo))
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
        overlap_matrix = calculate_overlap_matrix(df, products)

        # 5. NEW: Frequency Distribution
        frequency_distribution = calculate_frequency_distribution(df, products)

        # 6. NEW: Product Contribution Scores
        product_contribution = calculate_product_contribution(df, products)

        # 7. NEW: Reach Efficiency Metrics
        efficiency_metrics = calculate_reach_efficiency(optimal_portfolios)

        # 8. NEW: Demographic Segment Analysis
        demographic_cols = [col for col in df_raw.columns 
                           if col not in [selection_col, 'parsed_selection'] 
                           and df_raw[col].dtype == 'object']
        
        segment_analysis = calculate_segment_analysis(df_raw, df, products, demographic_cols)

        # 9. Recommendation
        recommendation = {}
        if '3' in optimal_portfolios:
            recommendation = {
                'size': 3,
                'products': optimal_portfolios['3']['combination'].split(' + '),
                'reach': optimal_portfolios['3']['reach'],
                'frequency': optimal_portfolios['3']['frequency']
            }
        elif '2' in optimal_portfolios:
            recommendation = {
                'size': 2,
                'products': optimal_portfolios['2']['combination'].split(' + '),
                'reach': optimal_portfolios['2']['reach'],
                'frequency': optimal_portfolios['2']['frequency']
            }

        # Prepare results dictionary
        results_dict = {
            'individual_reach': df_individual.to_dict('records'),
            'optimal_portfolios': optimal_portfolios,
            'top_combinations': top_combinations,
            'incremental_reach': df_incremental.to_dict('records'),
            'recommendation': recommendation,
            'overlap_matrix': overlap_matrix,
            'frequency_distribution': frequency_distribution,
            'product_contribution': product_contribution,
            'efficiency_metrics': efficiency_metrics,
            'segment_analysis': segment_analysis,
            'reach_target': 80.0,
            'total_respondents': int(n_respondents)
        }
        results_dict['interpretation'] = get_interpretation(results_dict)

        # Visualization
        fig, axes = plt.subplots(3, 2, figsize=(16, 18))
        fig.suptitle('TURF Analysis Results', fontsize=18, fontweight='bold')

        # 1. Individual Reach
        sns.barplot(x='Reach (%)', y='Product', data=df_individual, ax=axes[0, 0], palette='viridis')
        axes[0, 0].set_title('Individual Product Reach', fontsize=13, fontweight='bold')
        axes[0, 0].set_xlabel('Reach (%)')

        # 2. Incremental Reach
        ax2 = axes[0, 1]
        bars = ax2.bar(range(len(df_incremental)), df_incremental['Incremental Reach (%)'], 
                       color='skyblue', label='Incremental Reach', alpha=0.7)
        ax2.set_xticks(range(len(df_incremental)))
        ax2.set_xticklabels(df_incremental['Product'], rotation=45, ha='right', fontsize=9)
        
        ax2_twin = ax2.twinx()
        ax2_twin.plot(range(len(df_incremental)), df_incremental['Cumulative Reach (%)'], 
                      color='red', marker='o', linewidth=2, markersize=8, label='Cumulative Reach')
        
        ax2.set_title('Incremental Reach by Product', fontsize=13, fontweight='bold')
        ax2.set_xlabel('Product (Ranked by Individual Reach)')
        ax2.set_ylabel('Incremental Reach (%)', color='skyblue')
        ax2_twin.set_ylabel('Cumulative Reach (%)', color='red')
        
        lines1, labels1 = ax2.get_legend_handles_labels()
        lines2, labels2 = ax2_twin.get_legend_handles_labels()
        ax2.legend(lines1 + lines2, labels1 + labels2, loc='upper left', fontsize=9)

        # 3. Optimal Portfolio Reach
        portfolio_sizes_str = sorted(optimal_portfolios.keys(), key=int)
        portfolio_sizes_int = [int(s) for s in portfolio_sizes_str]
        optimal_reaches = [optimal_portfolios[size]['reach'] for size in portfolio_sizes_str]
        
        axes[1, 0].plot(portfolio_sizes_int, optimal_reaches, marker='o', linewidth=3, 
                       markersize=12, color='#2E86AB')
        axes[1, 0].set_title('Max Reach by Portfolio Size', fontsize=13, fontweight='bold')
        axes[1, 0].set_xlabel('Number of Products in Portfolio')
        axes[1, 0].set_ylabel('Maximum Reach (%)')
        axes[1, 0].grid(True, alpha=0.3)
        
        # 4. Reach vs Frequency
        optimal_freqs = [optimal_portfolios[size]['frequency'] for size in portfolio_sizes_str]
        scatter = axes[1, 1].scatter(optimal_reaches, optimal_freqs, 
                                     c=portfolio_sizes_int, cmap='viridis', 
                                     s=300, alpha=0.7, edgecolors='black', linewidth=2)
        
        for i, size in enumerate(portfolio_sizes_int):
            axes[1, 1].annotate(f'{size}', 
                               (optimal_reaches[i], optimal_freqs[i]),
                               fontsize=11, fontweight='bold', ha='center', va='center')
        
        axes[1, 1].set_title('Reach vs. Frequency Trade-off', fontsize=13, fontweight='bold')
        axes[1, 1].set_xlabel('Reach (%)')
        axes[1, 1].set_ylabel('Average Frequency')
        axes[1, 1].grid(True, alpha=0.3)

        # 5. NEW: Frequency Distribution
        freq_data = pd.DataFrame(frequency_distribution)
        freq_data = freq_data[freq_data['n_products'] > 0]  # Exclude 0 selections
        
        axes[2, 0].bar(freq_data['n_products'], freq_data['percentage'], color='#a67b70', alpha=0.8)
        axes[2, 0].set_title('Selection Frequency Distribution', fontsize=13, fontweight='bold')
        axes[2, 0].set_xlabel('Number of Products Selected')
        axes[2, 0].set_ylabel('Percentage of Respondents (%)')
        axes[2, 0].grid(True, alpha=0.3, axis='y')
        
        # Add average line
        avg_selections = (df[products].sum(axis=1)).mean()
        axes[2, 0].axvline(avg_selections, color='red', linestyle='--', linewidth=2, 
                          label=f'Avg: {avg_selections:.1f}')
        axes[2, 0].legend()

        # 6. NEW: Reach Efficiency
        efficiency_df = pd.DataFrame(efficiency_metrics)
        ax6 = axes[2, 1]
        ax6.bar(efficiency_df['portfolio_size'], efficiency_df['efficiency'], 
               color='#7a9471', alpha=0.8)
        ax6.set_title('Incremental Reach Efficiency', fontsize=13, fontweight='bold')
        ax6.set_xlabel('Portfolio Size')
        ax6.set_ylabel('Efficiency (Incremental Reach per Product)')
        ax6.grid(True, alpha=0.3, axis='y')

        plt.tight_layout(rect=[0, 0.02, 1, 0.98])
        
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
    