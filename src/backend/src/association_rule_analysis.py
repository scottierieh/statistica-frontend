
import sys
import json
import pandas as pd
from mlxtend.frequent_patterns import apriori, association_rules
from mlxtend.preprocessing import TransactionEncoder
import numpy as np

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


def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        # New: `item_cols` will be a list of columns representing items
        item_cols = payload.get('item_cols')
        min_support = float(payload.get('min_support', 0.05))
        metric = payload.get('metric', 'confidence')
        min_threshold = float(payload.get('min_threshold', 0.7))

        if not data or not item_cols:
            raise ValueError("Missing 'data' or 'item_cols'")

        df = pd.DataFrame(data)
        
        # Select only the item columns for analysis
        df_items = df[item_cols]

        # The data is already in a one-hot like format (0s and 1s)
        # We need to convert it to boolean for apriori
        df_encoded = df_items.astype(bool)

        # Apriori algorithm
        frequent_itemsets = apriori(df_encoded, min_support=min_support, use_colnames=True)
        
        if frequent_itemsets.empty:
            raise ValueError(f"No itemsets found with a minimum support of {min_support}. Try lowering the value.")

        # Association rules
        rules = association_rules(frequent_itemsets, metric=metric, min_threshold=min_threshold)
        
        # Sort by lift and confidence
        rules = rules.sort_values(['lift', 'confidence'], ascending=[False, False])
        
        # Convert frozenset to list for JSON serialization
        frequent_itemsets['itemsets'] = frequent_itemsets['itemsets'].apply(lambda x: sorted(list(x)))

        rules['antecedents'] = rules['antecedents'].apply(lambda x: sorted(list(x)))
        rules['consequents'] = rules['consequents'].apply(lambda x: sorted(list(x)))

        response = {
            'frequent_itemsets': frequent_itemsets.to_dict('records'),
            'association_rules': rules.to_dict('records')
        }

        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
