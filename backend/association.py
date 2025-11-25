import sys
import json
import pandas as pd
from mlxtend.frequent_patterns import apriori, association_rules
import numpy as np
import base64
from io import BytesIO
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns

def _to_native_type(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, (float, np.floating)):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return float(obj)
    elif isinstance(obj, (np.bool_, bool)):
        return bool(obj)
    elif isinstance(obj, (frozenset, set)):
        return sorted(list(obj))
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    return obj

def clean_dataframe_for_json(df):
    """Convert all DataFrame values to JSON-serializable types"""
    result = []
    for _, row in df.iterrows():
        cleaned_row = {}
        for key, value in row.items():
            cleaned_row[key] = _to_native_type(value)
        result.append(cleaned_row)
    return result

def generate_scatter_plot(rules):
    """Generate scatter plot visualization for association rules"""
    try:
        if rules.empty:
            return None
            
        plt.figure(figsize=(10, 6))
        
        # Use seaborn for a more visually appealing plot
        scatter_plot = sns.scatterplot(
            x='support', 
            y='confidence', 
            size='lift', 
            hue='lift',
            data=rules,
            palette='viridis',
            sizes=(20, 200),
            alpha=0.7,
            edgecolor='w',
            linewidth=0.5
        )
        
        plt.title('Association Rules: Support vs. Confidence', fontsize=16)
        plt.xlabel('Support', fontsize=12)
        plt.ylabel('Confidence', fontsize=12)
        
        # Move legend
        plt.legend(bbox_to_anchor=(1.05, 1), loc='upper left', borderaxespad=0.)
        
        plt.grid(True, which='both', linestyle='--', linewidth=0.5)
        
        plt.tight_layout()
        
        # Convert to base64
        buffer = BytesIO()
        plt.savefig(buffer, format='png', dpi=100, bbox_inches='tight')
        buffer.seek(0)
        image_base64 = base64.b64encode(buffer.read()).decode()
        plt.close()
        
        return image_base64
        
    except Exception as e:
        print(f"Error generating scatter plot: {str(e)}", file=sys.stderr)
        return None


def generate_interpretation(rules, frequent_itemsets):
    """Generate interpretation of the results"""
    interpretation = {
        'summary': {},
        'top_rules': [],
        'key_insights': []
    }
    
    # Summary statistics
    interpretation['summary'] = {
        'total_rules': len(rules),
        'total_itemsets': len(frequent_itemsets),
        'avg_confidence': float(rules['confidence'].mean()) if len(rules) > 0 else 0,
        'avg_lift': float(rules['lift'].mean()) if len(rules) > 0 else 0,
        'max_lift': float(rules['lift'].max()) if len(rules) > 0 else 0
    }
    
    # Top 5 rules by lift
    if len(rules) > 0:
        top_5 = rules.nlargest(5, 'lift')
        for _, rule in top_5.iterrows():
            ant_str = ', '.join(rule['antecedents'])
            cons_str = ', '.join(rule['consequents'])
            interpretation['top_rules'].append({
                'rule': f"{ant_str} → {cons_str}",
                'lift': float(rule['lift']),
                'confidence': float(rule['confidence']),
                'support': float(rule['support']),
                'interpretation': f"Customers who buy {ant_str} are {rule['lift']:.2f}x more likely to also buy {cons_str} (happens in {rule['support']*100:.1f}% of transactions)"
            })
    
    # Key insights
    if len(rules) > 0:
        strong_rules = rules[rules['lift'] > 1.5]
        high_conf_rules = rules[rules['confidence'] > 0.7]
        
        interpretation['key_insights'].append({
            'title': 'Strong Associations',
            'description': f"Found {len(strong_rules)} rules with lift > 1.5, indicating strong positive associations between items."
        })
        
        interpretation['key_insights'].append({
            'title': 'Reliable Rules',
            'description': f"Found {len(high_conf_rules)} rules with confidence > 70%, meaning these patterns occur reliably."
        })
        
        # Most frequent items in rules
        all_items = []
        for _, rule in rules.iterrows():
            all_items.extend(rule['antecedents'])
            all_items.extend(rule['consequents'])
        
        if all_items:
            from collections import Counter
            item_counts = Counter(all_items)
            most_common = item_counts.most_common(3)
            items_str = ', '.join([f"{item} ({count})" for item, count in most_common])
            interpretation['key_insights'].append({
                'title': 'Most Connected Items',
                'description': f"Items appearing most frequently in rules: {items_str}"
            })
    
    return interpretation

def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        item_cols = payload.get('item_cols')
        min_support = float(payload.get('min_support', 0.05))
        metric = payload.get('metric', 'confidence')
        min_threshold = float(payload.get('min_threshold', 0.7))

        if not data or not item_cols:
            raise ValueError("Missing 'data' or 'item_cols'")

        df = pd.DataFrame(data)
        
        # Select only the item columns for analysis
        df_items = df[item_cols]

        # Convert the data to boolean type for apriori function
        df_encoded = df_items.astype(bool)

        # Apriori algorithm
        frequent_itemsets = apriori(df_encoded, min_support=min_support, use_colnames=True)
        
        if frequent_itemsets.empty:
            raise ValueError(f"No itemsets found with a minimum support of {min_support}. Try lowering the value.")

        # Association rules
        rules = association_rules(frequent_itemsets, metric=metric, min_threshold=min_threshold, num_itemsets=len(frequent_itemsets))
        
        if rules.empty:
            raise ValueError(f"No rules found with metric '{metric}' >= {min_threshold}. Try lowering the threshold.")
        
        # Sort by lift and confidence
        rules = rules.sort_values(['lift', 'confidence'], ascending=[False, False])
        
        # Convert frozenset to list for JSON serialization
        frequent_itemsets['itemsets'] = frequent_itemsets['itemsets'].apply(lambda x: sorted(list(x)))
        rules['antecedents'] = rules['antecedents'].apply(lambda x: sorted(list(x)))
        rules['consequents'] = rules['consequents'].apply(lambda x: sorted(list(x)))

        # Generate scatter plot
        scatter_plot = generate_scatter_plot(rules)
        
        # Generate interpretation
        interpretation = generate_interpretation(rules, frequent_itemsets)

        # Use the new cleaning function
        response = {
            'frequent_itemsets': clean_dataframe_for_json(frequent_itemsets),
            'association_rules': clean_dataframe_for_json(rules),
            'scatter_plot': scatter_plot,
            'interpretation': interpretation
        }

        print(json.dumps(response))

    except Exception as e:
        error_response = {"error": str(e)}
        print(json.dumps(error_response), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
    