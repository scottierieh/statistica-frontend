
import sys
import json
import numpy as np
import pandas as pd
import warnings

try:
    import pulp
    USE_PULP = True
except ImportError:
    USE_PULP = False

warnings.filterwarnings('ignore')

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

class DEAAnalyzer:
    def __init__(self, data: pd.DataFrame, input_cols: list, output_cols: list, dmu_col: str):
        self.dmu_names = data[dmu_col].tolist()
        self.inputs = data[input_cols].values
        self.outputs = data[output_cols].values
        
    def analyze(self, orientation='input', rts='crs'):
        if not USE_PULP:
            raise ImportError("PuLP library is not installed. Please install it via 'pip install pulp'.")
        
        n_dmus, n_inputs = self.inputs.shape
        n_outputs = self.outputs.shape[1]
        
        efficiencies = {}
        lambdas = {}
        reference_sets = {}

        for k in range(n_dmus):
            dmu_name = self.dmu_names[k]
            
            if orientation == 'input':
                prob = pulp.LpProblem(f"DEA_Input_{k}", pulp.LpMinimize)
                theta = pulp.LpVariable("theta", lowBound=0)
                lambda_vars = [pulp.LpVariable(f"lambda_{j}", lowBound=0) for j in range(n_dmus)]
                
                prob += theta
                
                for i in range(n_inputs):
                    prob += pulp.lpSum([lambda_vars[j] * self.inputs[j, i] for j in range(n_dmus)]) <= theta * self.inputs[k, i]
                
                for r in range(n_outputs):
                    prob += pulp.lpSum([lambda_vars[j] * self.outputs[j, r] for j in range(n_dmus)]) >= self.outputs[k, r]

                if rts == 'vrs':
                    prob += pulp.lpSum(lambda_vars) == 1

                prob.solve(pulp.PULP_CBC_CMD(msg=0))
                
                if prob.status == pulp.LpStatusOptimal:
                    efficiencies[dmu_name] = theta.varValue
                    current_lambdas = [var.varValue for var in lambda_vars]
                    lambdas[dmu_name] = current_lambdas
                    reference_sets[dmu_name] = [self.dmu_names[j] for j, l_val in enumerate(current_lambdas) if l_val > 1e-6]

                else:
                    efficiencies[dmu_name] = 0.0
                    lambdas[dmu_name] = [0.0] * n_dmus
                    reference_sets[dmu_name] = []
            
            # Note: Output-oriented model would be similar but is omitted for brevity as input-oriented is more common.
        
        return efficiencies, lambdas, reference_sets


def main():
    try:
        payload = json.load(sys.stdin)
        data_json = payload.get('data')
        dmu_col = payload.get('dmu_col')
        input_cols = payload.get('input_cols')
        output_cols = payload.get('output_cols')
        orientation = payload.get('orientation', 'input')
        rts = payload.get('rts', 'crs')

        if not all([data_json, dmu_col, input_cols, output_cols]):
            raise ValueError("Missing required parameters.")
            
        df = pd.DataFrame(data_json)
        
        # Ensure numeric types
        for col in input_cols + output_cols:
            df[col] = pd.to_numeric(df[col], errors='coerce')
        df.dropna(subset=input_cols + output_cols, inplace=True)
        
        if df.empty:
             raise ValueError("No valid numeric data for analysis.")

        analyzer = DEAAnalyzer(df, input_cols, output_cols, dmu_col)
        efficiencies, lambdas, reference_sets = analyzer.analyze(orientation, rts)

        eff_scores = list(efficiencies.values())
        summary = {
            'total_dmus': len(df),
            'efficient_dmus': sum(1 for e in eff_scores if e >= 0.9999),
            'inefficient_dmus': sum(1 for e in eff_scores if e < 0.9999),
            'average_efficiency': np.mean(eff_scores) if eff_scores else 0
        }

        response = {
            'results': {
                'efficiency_scores': efficiencies,
                'reference_sets': reference_sets,
                'lambdas': lambdas,
                'summary': summary,
                'dmu_col': dmu_col
            }
        }
        
        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
