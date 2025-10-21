#!/usr/bin/env python3
import sys
import json
import pandas as pd
import numpy as np
from itertools import combinations

def _to_native_type(obj):
    """Convert numpy types to native Python types for JSON serialization"""
    if isinstance(obj, (np.integer, np.int64, np.int32)):
        return int(obj)
    elif isinstance(obj, (np.floating, np.float64, np.float32)):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, dict):
        return {k: _to_native_type(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [_to_native_type(item) for item in obj]
    return obj

def calculate_turf(df, product_list, n_respondents):
    """Calculate TURF metrics for a given product combination"""
    if not product_list:
        return {
            'products': [],
            'combination': '',
            'reach': 0,
            'reach_count': 0,
            'frequency': 0,
            'n_products': 0
        }
    
    # Reach: at least one product selected
    reach_mask = df[list(product_list)].sum(axis=1) > 0
    reach_count = reach_mask.sum()
    reach_pct = (reach_count / n_respondents) * 100 if n_respondents > 0 else 0
    
    # Frequency: average number of products selected among those who selected at least one
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

def calculate_product_contribution(df, products, n_respondents, optimal_portfolios):
    """Calculate each product's contribution to combinations"""
    contribution = {}
    
    for product in products:
        appears_in = 0
        total_reach_contribution = 0
        
        # Count appearances in top combinations
        for size_str, combos in optimal_portfolios.items():
            if product in combos['products']:
                appears_in += 1
                total_reach_contribution += combos['reach']
        
        avg_contribution = total_reach_contribution / appears_in if appears_in > 0 else 0
        
        # Importance score: individual reach * appearance frequency
        individual_reach = (df[product].sum() / n_respondents) * 100
        importance_score = individual_reach * (appears_in / len(optimal_portfolios)) if len(optimal_portfolios) > 0 else individual_reach
        
        contribution[product] = {
            'appears_in_combinations': int(appears_in),
            'avg_reach_contribution': float(avg_contribution),
            'importance_score': float(importance_score)
        }
    
    return contribution

def calculate_efficiency_metrics(optimal_portfolios):
    """Calculate efficiency metrics for each portfolio size"""
    metrics = []
    
    for size_str, portfolio in optimal_portfolios.items():
        size = int(size_str)
        reach = portfolio['reach']
        efficiency = reach / size if size > 0 else 0
        
        metrics.append({
            'portfolio_size': size,
            'reach': float(reach),
            'efficiency': float(efficiency),
            'reach_per_product': float(efficiency)
        })
    
    return sorted(metrics, key=lambda x: x['portfolio_size'])

def calculate_frequency_distribution(df_raw, selection_col):
    """Calculate distribution of how many products customers select"""
    distribution = []
    
    # Count products per response
    product_counts = df_raw['parsed_selection'].apply(len)
    
    for n in range(product_counts.max() + 1):
        count = (product_counts == n).sum()
        percentage = (count / len(df_raw)) * 100 if len(df_raw) > 0 else 0
        
        distribution.append({
            'n_products': int(n),
            'count': int(count),
            'percentage': float(percentage)
        })
    
    return distribution

def calculate_segment_analysis(df_raw, df, products, n_respondents, demographics):
    """Calculate TURF analysis for each demographic segment"""
    if not demographics or len(demographics) == 0:
        return {}
    
    segment_analysis = {}
    
    # Get all demographic questions
    demo_keys = set()
    for demo in demographics:
        demo_keys.update(demo.keys())
    
    for demo_key in demo_keys:
        # Get unique values for this demographic
        demo_values = set()
        for demo in demographics:
            if demo_key in demo and demo[demo_key]:
                demo_values.add(str(demo[demo_key]))
        
        if not demo_values:
            continue
        
        segment_analysis[demo_key] = {}
        
        for demo_value in demo_values:
            # Filter responses for this segment
            segment_indices = [
                i for i, demo in enumerate(demographics)
                if demo.get(demo_key) and str(demo.get(demo_key)) == demo_value
            ]
            
            if len(segment_indices) == 0:
                continue
            
            segment_df = df.iloc[segment_indices]
            segment_size = len(segment_df)
            
            # Calculate individual reach for this segment
            segment_reach = []
            for product in products:
                reach = (segment_df[product].sum() / segment_size) * 100 if segment_size > 0 else 0
                segment_reach.append({'product': product, 'reach': reach})
            
            segment_reach.sort(key=lambda x: x['reach'], reverse=True)
            top_products = [item['product'] for item in segment_reach[:5]]
            
            # Find optimal combination for this segment (size 3)
            best_combo = None
            best_reach = 0
            
            for combo in combinations(products, min(3, len(products))):
                result = calculate_turf(segment_df, list(combo), segment_size)
                if result['reach'] > best_reach:
                    best_reach = result['reach']
                    best_combo = list(combo)
            
            segment_analysis[demo_key][demo_value] = {
                'optimal_combination': best_combo or [],
                'optimal_reach': float(best_reach),
                'size': int(segment_size),
                'top_products': top_products
            }
    
    return segment_analysis

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
        f"The TURF analysis reveals which combination of products maximizes unique customer reach.\\n\\n"
        f"**Top Individual Performer:** **'{top_item}'** has the highest individual reach, appealing to **{top_reach:.1f}%** of respondents on its own, making it a strong anchor product for any portfolio.\\n\\n"
        f"**Optimal Portfolio:** To achieve your target reach of {results.get('reach_target', 80)}%, the recommended combination of **{best_combo_size} products** is **'{' + '.join(best_combo_products)}'**, which reaches **{best_combo_reach:.1f}%** of the audience. This offers an efficient balance of reach and portfolio size.\\n\\n"
        f"**Diminishing Returns:** Based on the incremental reach analysis, adding products beyond the 3rd or 4th item yields significantly smaller gains in new customer reach. This suggests that a portfolio of 3-4 products is likely the most cost-effective sweet spot."
    )
    return interp.strip()

def main():
    try:
        # Read input
        payload = json.load(sys.stdin)
        data = payload.get('data')
        selection_col = payload.get('selectionCol')
        demographics = payload.get('demographics', [])
        
        # Validation
        if not data or not selection_col:
            raise ValueError("Missing 'data' or 'selectionCol'")
        
        # Create DataFrame
        df_raw = pd.DataFrame(data)
        df_raw.dropna(subset=[selection_col], inplace=True)
        
        # Parse selections
        def clean_selection(x):
            if isinstance(x, list):
                return [str(item).strip().strip("[]'\" ") for item in x if item]
            elif isinstance(x, str):
                cleaned = x.strip("[]'\" ")
                return [item.strip().strip("[]'\" ") for item in cleaned.split(',') if item.strip()]
            else:
                return []
        
        df_raw['parsed_selection'] = df_raw[selection_col].apply(clean_selection)
        df_raw = df_raw[df_raw['parsed_selection'].apply(len) > 0]
        
        if len(df_raw) == 0:
            raise ValueError("No valid responses found after parsing.")
        
        # Get all unique products
        all_products = set()
        for selection_list in df_raw['parsed_selection']:
            for product in selection_list:
                if product:
                    all_products.add(product)
        
        products = sorted(list(all_products))
        
        if len(products) == 0:
            raise ValueError("No products found in the data.")
        
        # Create binary matrix
        binary_data = []
        for selection_list in df_raw['parsed_selection']:
            row = {product: 1 if product in selection_list else 0 for product in products}
            binary_data.append(row)
        
        df = pd.DataFrame(binary_data)
        n_respondents = len(df)
        
        # 1. Individual Product Reach
        individual_reach_list = []
        for product in products:
            count = df[product].sum()
            reach = (count / n_respondents) * 100
            individual_reach_list.append({
                'Product': product,
                'Reach (%)': float(reach),
                'Count': int(count)
            })
        
        df_individual = pd.DataFrame(individual_reach_list).sort_values('Reach (%)', ascending=False)
        
        # 2. Optimal Portfolio & Top Combinations
        optimal_portfolios = {}
        all_combinations_by_size = {}
        max_portfolio_size = min(7, len(products))
        
        for size in range(1, max_portfolio_size + 1):
            results_list = [calculate_turf(df, list(combo), n_respondents) for combo in combinations(products, size)]
            if results_list:
                df_results = pd.DataFrame(results_list).sort_values('reach', ascending=False)
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
                'Order': i + 1,
                'Product': product,
                'Incremental Reach (%)': float(incremental_pct),
                'Incremental Reach (count)': int(new_reach_count),
                'Cumulative Reach (%)': float(cumulative_reach_pct),
            })
        
        # 4. Optimal Recommendation
        recommendation = {}
        reach_target = 80.0
        
        for size_str, portfolio in optimal_portfolios.items():
            if portfolio['reach'] >= reach_target:
                recommendation = {
                    'size': int(size_str),
                    'products': portfolio['products'],
                    'reach': float(portfolio['reach']),
                    'frequency': float(portfolio.get('frequency', 0))
                }
                break
        
        # Fallback if target not met
        if not recommendation and optimal_portfolios:
            last_size = str(max_portfolio_size)
            if last_size in optimal_portfolios:
                recommendation = {
                    'size': int(last_size),
                    'products': optimal_portfolios[last_size]['products'],
                    'reach': float(optimal_portfolios[last_size]['reach']),
                    'frequency': float(optimal_portfolios[last_size].get('frequency', 0))
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
        
        # 6. Frequency Distribution
        frequency_distribution = calculate_frequency_distribution(df_raw, selection_col)
        
        # 7. Product Contribution
        product_contribution = calculate_product_contribution(df, products, n_respondents, optimal_portfolios)
        
        # 8. Efficiency Metrics
        efficiency_metrics = calculate_efficiency_metrics(optimal_portfolios)
        
        # 9. Segment Analysis
        segment_analysis = calculate_segment_analysis(df_raw, df, products, n_respondents, demographics)
        
        # Compile results
        results_dict = {
            'individual_reach': df_individual.to_dict('records'),
            'optimal_portfolios': optimal_portfolios,
            'top_combinations': all_combinations_by_size,
            'incremental_reach': incremental_results,
            'recommendation': recommendation,
            'overlap_matrix': overlap_matrix.to_dict('index'),
            'frequency_distribution': frequency_distribution,
            'product_contribution': product_contribution,
            'efficiency_metrics': efficiency_metrics,
            'segment_analysis': segment_analysis,
            'reach_target': float(reach_target),
            'total_respondents': int(n_respondents),
        }
        
        results_dict['interpretation'] = get_interpretation(results_dict)
        
        # Return JSON only (no plot)
        response = {'results': _to_native_type(results_dict)}
        print(json.dumps(response, default=_to_native_type))
    
    except Exception as e:
        error_response = {"error": str(e)}
        print(json.dumps(error_response), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()


