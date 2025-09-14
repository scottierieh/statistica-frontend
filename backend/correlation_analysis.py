
import sys
import json
import numpy as np
import pandas as pd
from scipy import stats
from scipy.stats import pearsonr, spearmanr, kendalltau

def main():
    try:
        payload = json.load(sys.stdin)
        
        data = payload.get('data')
        variables = payload.get('variables')
        method = payload.get('method', 'pearson')

        if not data or not variables:
            raise ValueError("Missing 'data' or 'variables'")

        df = pd.DataFrame(data)
        df = df[variables].copy()

        # Simple cleaning
        df.dropna(inplace=True)
        
        if df.shape[0] < 2:
            raise ValueError("Not enough valid data points for analysis.")

        results = []
        
        for i, var1 in enumerate(variables):
            for j, var2 in enumerate(variables):
                if i < j: # Calculate only upper triangle
                    
                    # Ensure columns are numeric, coercing errors
                    col1 = pd.to_numeric(df[var1], errors='coerce')
                    col2 = pd.to_numeric(df[var2], errors='coerce')
                    
                    # Drop NaN pairs
                    pair_data = pd.concat([col1, col2], axis=1).dropna()
                    
                    if pair_data.shape[0] < 2:
                        corr, p_value = np.nan, np.nan
                    else:
                        if method == 'pearson':
                            corr, p_value = pearsonr(pair_data[var1], pair_data[var2])
                        elif method == 'spearman':
                            corr, p_value = spearmanr(pair_data[var1], pair_data[var2])
                        elif method == 'kendall':
                            corr, p_value = kendalltau(pair_data[var1], pair_data[var2])
                        else:
                            raise ValueError(f"Unknown correlation method: {method}")
                    
                    results.append({
                        'variable_1': var1,
                        'variable_2': var2,
                        'correlation': corr,
                        'p_value': p_value
                    })

        print(json.dumps(results))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
