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
    """Convert numpy types to native Python types for JSON serialization"""
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
    """Generate natural language interpretation of results"""
    if not results or not results.get('optimal_portfolios'):
        return "No data available for interpretation."

    individual_reach = results.get('individual_reach', [])
    recommendation = results.get('recommendation', {})
    
    top_item = individual_reach[0]['Product'] if individual_reach else "N/A"
    top_reach = individual_reach[0]['Reach (%)'] if individual_reach else 0

    best_combo_size = recommendation.get('size', 2)
    best_combo_products = recommendation.get('products', [])
    best_combo_reach = recommendation.get('reach', 0)
    
    interp = (
        f"The TURF analysis reveals which combination of products maximizes unique customer reach.\n\n"
        f"**Top Individual Performer:** '{top_item}' has the highest individual reach at {top_reach:.1f}%, "
        f"making it a strong anchor product for any portfolio.\n\n"
        f"**Optimal Portfolio:** The recommended combination of {best_combo_size} products "
        f"('{', '.join(best_combo_products)}') reaches {best_combo_reach:.1f}% of the audience, "
        f"offering an efficient balance of reach and portfolio size.\n\n"
        f"**Diminishing Returns:** Adding products beyond the {best_combo_size}th item yields "
        f"significantly smaller gains in new customer reach."
    )
    return interp.strip()

def calculate_turf(df, product_list, n_respondents):
    """Calculate TURF metrics for a given product combination"""
    if not product_list:
        return {
            'reach': 0, 
            'reach_count': 0, 
            'frequency': 0, 
            'n_products': 0,
            'products': [],
            'combination': ''
        }
    
    # Calculate reach (anyone who selected at least one product)
    reach_mask = df[list(product_list)].sum(axis=1) > 0
    reach_count = reach_mask.sum()
    reach_pct = (reach_count / n_respondents) * 100 if n_respondents > 0 else 0
    
    # Calculate frequency (average number of products selected among those who selected any)
    if reach_count > 0:
        frequency = df.loc[reach_mask, list(product_list)].sum(axis=1).mean()
    else:
        frequency = 0
    
    return {
        'products': list(product_list),
        'combination': ' + '.join(product_list),
        'reach': float(reach_pct),
        'reach_count': int(reach_count),
        'frequency': float(frequency),
        'n_products': len(product_list)
    }

def main():
    try:
        # Read input
        payload = json.load(sys.stdin)
        data = payload.get('data')
        selection_col = payload.get('selectionCol')
        demographic_data = payload.get('demographics', [])

        if not data or not selection_col:
            raise ValueError("Missing 'data' or 'selectionCol'")

        # === DATA PREPROCESSING ===
        df_raw = pd.DataFrame(data)
        
        # Add demographic data if provided
        if demographic_data and len(demographic_data) == len(df_raw):
            df_demographics = pd.DataFrame(demographic_data)
            df_raw = pd.concat([df_raw, df_demographics], axis=1)
        
        df_raw.dropna(subset=[selection_col], inplace=True)
        
        # Parse selection column
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
        
        # Extract all unique products
        all_products = set()
        for products_list in df_raw['parsed_selection']:
            for product in products_list:
                cleaned = str(product).strip().strip("[]'\"")
                if cleaned:
                    all_products.add(cleaned)
        
        products = sorted(list(all_products))
        
        if len(products) == 0:
            raise ValueError("No products found in data.")
        
        # Build binary matrix
        binary_data = []
        for products_list in df_raw['parsed_selection']:
            cleaned_selection = [str(p).strip().strip("[]'\"") for p in products_list]
            row = {product: 1 if product in cleaned_selection else 0 for product in products}
            binary_data.append(row)
        
        df = pd.DataFrame(binary_data)
        n_respondents = len(df)

        # === 1. INDIVIDUAL PRODUCT REACH ===
        individual_reach_list = []
        for product in products:
            count = int(df[product].sum())
            reach = (count / n_respondents) * 100
            individual_reach_list.append({
                'Product': product,
                'Reach (%)': float(reach),
                'Count': count
            })
        
        individual_reach_list.sort(key=lambda x: x['Reach (%)'], reverse=True)

        # === 2. OPTIMAL PORTFOLIO ANALYSIS ===
        optimal_portfolios = {}
        top_combinations = {}
        max_portfolio_size = min(5, len(products))
        
        for portfolio_size in range(1, max_portfolio_size + 1):
            results = []
            for combo in combinations(products, portfolio_size):
                turf_result = calculate_turf(df, list(combo), n_respondents)
                results.append(turf_result)
            
            if results:
                # Sort by reach
                results.sort(key=lambda x: x['reach'], reverse=True)
                
                # Best combination for this size
                optimal_portfolios[str(portfolio_size)] = results[0]
                
                # Top 10 combinations for this size
                top_combinations[str(portfolio_size)] = results[:10]

        # === 3. INCREMENTAL REACH ANALYSIS ===
        sorted_products = [item['Product'] for item in individual_reach_list]
        incremental_results = []
        cumulative_reach_mask = np.zeros(n_respondents, dtype=bool)
        
        for i, product in enumerate(sorted_products):
            product_reach_mask = df[product] == 1
            new_reach_mask = product_reach_mask & ~cumulative_reach_mask
            incremental_reach_count = int(new_reach_mask.sum())
            incremental_pct = (incremental_reach_count / n_respondents) * 100
            
            cumulative_reach_mask |= product_reach_mask
            cumulative_reach_count = int(cumulative_reach_mask.sum())
            cumulative_reach_pct = (cumulative_reach_count / n_respondents) * 100
            
            incremental_results.append({
                'Order': i + 1,
                'Product': product,
                'Incremental Reach (%)': float(incremental_pct),
                'Incremental Reach (count)': incremental_reach_count,
                'Cumulative Reach (%)': float(cumulative_reach_pct),
                'Cumulative Reach (count)': cumulative_reach_count
            })

        # === 4. OVERLAP ANALYSIS ===
        overlap_matrix = {}
        overlap_pairs = []
        
        for prod1 in products:
            overlap_matrix[prod1] = {}
            for prod2 in products:
                if prod1 == prod2:
                    overlap_matrix[prod1][prod2] = 100.0
                else:
                    overlap_count = int(((df[prod1] == 1) & (df[prod2] == 1)).sum())
                    prod1_total = int(df[prod1].sum())
                    prod2_total = int(df[prod2].sum())
                    
                    # Percentage of prod1 buyers who also bought prod2
                    overlap_pct_1to2 = (overlap_count / prod1_total) * 100 if prod1_total > 0 else 0
                    # Percentage of prod2 buyers who also bought prod1
                    overlap_pct_2to1 = (overlap_count / prod2_total) * 100 if prod2_total > 0 else 0
                    
                    overlap_matrix[prod1][prod2] = float(overlap_pct_1to2)
                    
                    # Store pair data (avoid duplicates by checking prod1 < prod2)
                    if prod1 < prod2 and overlap_count > 0:
                        avg_overlap = (overlap_pct_1to2 + overlap_pct_2to1) / 2
                        overlap_pairs.append({
                            'prod1': prod1,
                            'prod2': prod2,
                            'overlap_count': overlap_count,
                            'overlap_pct': float(avg_overlap),
                            'prod1_to_prod2': float(overlap_pct_1to2),
                            'prod2_to_prod1': float(overlap_pct_2to1)
                        })
        
        # Sort by overlap count (absolute number of shared customers)
        overlap_pairs.sort(key=lambda x: x['overlap_count'], reverse=True)
        top_overlaps = overlap_pairs[:10]

        # === 5. FREQUENCY DISTRIBUTION ===
        selections_per_respondent = df[products].sum(axis=1)
        frequency_distribution = []
        for i in range(len(products) + 1):
            count = int((selections_per_respondent == i).sum())
            percentage = (count / n_respondents) * 100
            frequency_distribution.append({
                'n_products': i,
                'count': count,
                'percentage': float(percentage)
            })

        # === 6. PRODUCT CONTRIBUTION SCORES ===
        product_contribution = {}
        for product in products:
            appears_in_top = 0
            total_reach_contribution = 0
            
            for size in range(1, max_portfolio_size + 1):
                if str(size) in top_combinations:
                    for combo_info in top_combinations[str(size)]:
                        if product in combo_info['products']:
                            appears_in_top += 1
                            total_reach_contribution += combo_info['reach']
            
            avg_contribution = total_reach_contribution / appears_in_top if appears_in_top > 0 else 0
            product_contribution[product] = {
                'appears_in_combinations': appears_in_top,
                'avg_reach_contribution': float(avg_contribution),
                'importance_score': float(avg_contribution * appears_in_top / 100)
            }

        # === 7. EFFICIENCY METRICS ===
        efficiency_metrics = []
        portfolio_sizes = sorted([int(k) for k in optimal_portfolios.keys()])
        
        for i, size in enumerate(portfolio_sizes):
            size_str = str(size)
            reach = optimal_portfolios[size_str]['reach']
            
            if i > 0:
                prev_size = portfolio_sizes[i-1]
                prev_reach = optimal_portfolios[str(prev_size)]['reach']
                incremental_reach = reach - prev_reach
                efficiency = incremental_reach / (size - prev_size) if (size - prev_size) > 0 else 0
            else:
                efficiency = reach / size if size > 0 else 0
            
            efficiency_metrics.append({
                'portfolio_size': size,
                'reach': float(reach),
                'efficiency': float(efficiency),
                'reach_per_product': float(reach / size) if size > 0 else 0
            })

        # === 8. DEMOGRAPHIC SEGMENT ANALYSIS ===
        demographic_cols = [
            col for col in df_raw.columns 
            if col not in [selection_col, 'parsed_selection'] 
            and df_raw[col].dtype == 'object'
        ]
        
        segment_analysis = {}
        
        for col in demographic_cols:
            if df_raw[col].isna().all():
                continue
            
            segment_results_col = {}
            unique_values = df_raw[col].dropna().unique()
            
            for value in unique_values:
                segment_mask = (df_raw[col] == value).values
                df_segment = df[segment_mask]
                
                # Skip small segments
                if len(df_segment) < 5:
                    continue
                
                # Top products for this segment
                segment_reach = {}
                for p in products:
                    count = int(df_segment[p].sum())
                    reach = (count / len(df_segment)) * 100
                    segment_reach[p] = {'reach': float(reach), 'count': count}
                
                sorted_products_seg = sorted(
                    segment_reach.items(), 
                    key=lambda x: x[1]['reach'], 
                    reverse=True
                )[:3]
                
                # Best combination for this segment
                best_combo = None
                best_reach = 0
                combo_size = min(3, len(products))
                
                segment_combinations = []
                for combo in combinations(products, combo_size):
                    turf = calculate_turf(df_segment, list(combo), len(df_segment))
                    segment_combinations.append(turf)
                    if turf['reach'] > best_reach:
                        best_reach = turf['reach']
                        best_combo = combo
                
                segment_combinations.sort(key=lambda x: x['reach'], reverse=True)
                
                segment_results_col[str(value)] = {
                    'size': int(len(df_segment)),
                    'top_products': [
                        {'product': p, 'reach': float(data['reach']), 'count': data['count']} 
                        for p, data in sorted_products_seg
                    ],
                    'optimal_combination': list(best_combo) if best_combo else [],
                    'optimal_reach': float(best_reach),
                    'avg_frequency': float(df_segment[products].sum(axis=1).mean()),
                    'top_combinations': segment_combinations[:5]
                }
            
            if segment_results_col:
                segment_analysis[col] = segment_results_col

        # === 9. SOLO VS COMBO PERFORMANCE ===
        solo_vs_combo = []
        for product in products:
            # Solo reach
            solo_reach = next(
                (item['Reach (%)'] for item in individual_reach_list if item['Product'] == product), 
                0
            )
            
            # Find best combo reach that includes this product
            best_combo_reach = solo_reach
            for size in range(2, min(5, max_portfolio_size + 1)):
                if str(size) in top_combinations:
                    for combo_info in top_combinations[str(size)][:5]:
                        if product in combo_info['products']:
                            best_combo_reach = max(best_combo_reach, combo_info['reach'])
            
            lift = best_combo_reach - solo_reach
            
            solo_vs_combo.append({
                'product': product,
                'solo_reach': float(solo_reach),
                'combo_reach': float(best_combo_reach),
                'lift': float(lift)
            })

        # === 10. RECOMMENDATION ===
        recommendation = {}
        reach_target = 80.0
        
        for size_str, portfolio in sorted(optimal_portfolios.items(), key=lambda item: int(item[0])):
            if portfolio['reach'] >= reach_target:
                recommendation = {
                    'size': int(size_str),
                    'products': portfolio['products'],
                    'reach': float(portfolio['reach']),
                    'frequency': float(portfolio['frequency'])
                }
                break
        
        # If no portfolio meets target, use the best available
        if not recommendation and optimal_portfolios:
            last_size = str(max_portfolio_size)
            if last_size in optimal_portfolios:
                recommendation = {
                    'size': int(last_size),
                    'products': optimal_portfolios[last_size]['products'],
                    'reach': float(optimal_portfolios[last_size]['reach']),
                    'frequency': float(optimal_portfolios[last_size]['frequency'])
                }

        # === COMPILE RESULTS ===
        results_dict = {
            'individual_reach': individual_reach_list,
            'optimal_portfolios': optimal_portfolios,
            'top_combinations': top_combinations,
            'incremental_reach': incremental_results,
            'recommendation': recommendation,
            'overlap_matrix': overlap_matrix,
            'top_overlaps': top_overlaps,
            'frequency_distribution': frequency_distribution,
            'product_contribution': product_contribution,
            'efficiency_metrics': efficiency_metrics,
            'segment_analysis': segment_analysis,
            'solo_vs_combo': solo_vs_combo,
            'reach_target': reach_target,
            'total_respondents': n_respondents
        }
        
        results_dict['interpretation'] = get_interpretation(results_dict)

        # === PLOTTING ===
        fig, axes = plt.subplots(3, 2, figsize=(16, 24))
        fig.suptitle('TURF Analysis Dashboard', fontsize=18, fontweight='bold')

        # 1. Individual Reach
        df_individual = pd.DataFrame(individual_reach_list)
        sns.barplot(
            x='Reach (%)', 
            y='Product', 
            data=df_individual, 
            ax=axes[0, 0], 
            palette='viridis'
        )
        axes[0, 0].set_title('Individual Product Reach', fontsize=13, fontweight='bold')

        # 2. Incremental Reach
        df_incremental = pd.DataFrame(incremental_results)
        ax2 = axes[0, 1]
        ax2.bar(
            df_incremental['Product'], 
            df_incremental['Incremental Reach (%)'], 
            color='skyblue', 
            label='Incremental Reach', 
            alpha=0.7
        )
        ax2_twin = ax2.twinx()
        ax2_twin.plot(
            df_incremental['Product'], 
            df_incremental['Cumulative Reach (%)'], 
            color='red', 
            marker='o', 
            label='Cumulative Reach'
        )
        ax2.set_title('Incremental Reach by Product Rank', fontsize=13, fontweight='bold')
        ax2.tick_params(axis='x', rotation=45, labelsize=9)
        ax2.set_xlabel('Product')
        ax2.set_ylabel('Incremental Reach (%)')
        ax2_twin.set_ylabel('Cumulative Reach (%)')

        # 3. Portfolio Size vs Reach
        portfolio_sizes = [int(s) for s in optimal_portfolios.keys()]
        optimal_reaches = [optimal_portfolios[str(s)]['reach'] for s in portfolio_sizes]
        axes[1, 0].plot(portfolio_sizes, optimal_reaches, marker='o', color='#2E86AB', linewidth=2)
        axes[1, 0].set_title('Max Reach by Portfolio Size', fontsize=13, fontweight='bold')
        axes[1, 0].set_xlabel('Number of Products')
        axes[1, 0].set_ylabel('Maximum Reach (%)')
        axes[1, 0].grid(True, alpha=0.3)

        # 4. Overlap Heatmap (top 5 products)
        top_5_products = [item['Product'] for item in individual_reach_list[:5]]
        overlap_matrix_subset = pd.DataFrame(
            {p1: {p2: overlap_matrix[p1][p2] for p2 in top_5_products} for p1 in top_5_products}
        )
        sns.heatmap(
            overlap_matrix_subset, 
            annot=True, 
            cmap='coolwarm', 
            fmt=".1f", 
            ax=axes[1, 1]
        )
        axes[1, 1].set_title('Top 5 Product Overlap (%)', fontsize=13, fontweight='bold')

        # 5. Frequency Distribution
        freq_df = pd.DataFrame([f for f in frequency_distribution if f['n_products'] > 0])
        if not freq_df.empty:
            sns.barplot(
                x='n_products', 
                y='percentage', 
                data=freq_df, 
                ax=axes[2, 0], 
                color='#a67b70'
            )
        axes[2, 0].set_title('Number of Products Chosen', fontsize=13, fontweight='bold')
        axes[2, 0].set_xlabel('Number of Products')
        axes[2, 0].set_ylabel('% of Respondents')

        # 6. Reach vs Frequency
        reach_freq_data = [
            {
                'size': int(s), 
                'reach': optimal_portfolios[s]['reach'], 
                'frequency': optimal_portfolios[s]['frequency']
            }
            for s in optimal_portfolios.keys()
        ]
        df_reach_freq = pd.DataFrame(reach_freq_data)
        sns.scatterplot(
            x='reach', 
            y='frequency', 
            size='size', 
            data=df_reach_freq, 
            ax=axes[2, 1], 
            hue='size', 
            palette='viridis', 
            sizes=(50, 200),
            legend='full'
        )
        axes[2, 1].set_title('Reach vs. Frequency Trade-off', fontsize=13, fontweight='bold')
        axes[2, 1].set_xlabel('Reach (%)')
        axes[2, 1].set_ylabel('Average Frequency')

        plt.tight_layout(rect=[0, 0.02, 1, 0.98])

        # Save plot
        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=120, bbox_inches='tight')
        buf.seek(0)
        plot_image = base64.b64encode(buf.read()).decode('utf-8')
        plt.close()

        # === OUTPUT ===
        response = {
            'results': results_dict,
            'plot': plot_image
        }

        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        error_response = {"error": str(e)}
        print(json.dumps(error_response), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()

    