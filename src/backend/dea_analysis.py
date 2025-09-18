

import sys
import json
import numpy as np
import pandas as pd
import warnings

try:
    from scipy.optimize import linprog
    SCIPY_AVAILABLE = True
except ImportError:
    SCIPY_AVAILABLE = False

warnings.filterwarnings('ignore')

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

class DEAAnalyzer:
    def __init__(self, data: pd.DataFrame, input_cols: list, output_cols: list, dmu_col: str):
        self.dmu_names = data[dmu_col].tolist()
        self.inputs = data[input_cols].values
        self.outputs = data[output_cols].values
        
    def analyze(self, orientation='input', rts='crs'):
        if not SCIPY_AVAILABLE:
            raise ImportError("SciPy library is not installed. Please install it via 'pip install scipy'.")
        
        n_dmus, n_inputs = self.inputs.shape
        n_outputs = self.outputs.shape[1]
        
        efficiencies = np.zeros(n_dmus)
        lambdas_list = []

        for k in range(n_dmus):
            if orientation == 'input':
                # Objective function: minimize theta
                c = np.zeros(n_dmus + 1)
                c[0] = 1

                # Constraints
                # Input constraints: sum(lambda_j * input_ij) <= theta * input_ik
                # -> sum(lambda_j * input_ij) - theta * input_ik <= 0
                A_ub = np.zeros((n_inputs, n_dmus + 1))
                A_ub[:, 1:] = self.inputs.T
                A_ub[:, 0] = -self.inputs[k, :]
                b_ub = np.zeros(n_inputs)

                # Output constraints: sum(lambda_j * output_rj) >= output_rk
                # -> -sum(lambda_j * output_rj) <= -output_rk
                A_ub_output = np.zeros((n_outputs, n_dmus + 1))
                A_ub_output[:, 1:] = -self.outputs.T
                b_ub_output = -self.outputs[k, :]

                A_ub = np.vstack([A_ub, A_ub_output])
                b_ub = np.concatenate([b_ub, b_ub_output])

                # VRS constraint: sum(lambda_j) = 1
                if rts == 'vrs':
                    A_eq = np.ones((1, n_dmus + 1))
                    A_eq[0, 0] = 0
                    b_eq = np.array([1])
                else: # CRS
                    A_eq = None
                    b_eq = None

                # Bounds for variables (theta >= 0, lambda >= 0)
                bounds = [(0, None)] + [(0, None) for _ in range(n_dmus)]

                res = linprog(c, A_ub=A_ub, b_ub=b_ub, A_eq=A_eq, b_eq=b_eq, bounds=bounds, method='highs')

                if res.success:
                    efficiencies[k] = res.fun
                    lambdas_list.append(res.x[1:].tolist())
                else:
                    efficiencies[k] = np.nan
                    lambdas_list.append([np.nan] * n_dmus)
            
            else: # Output-oriented
                # Objective function: maximize phi -> minimize -phi
                c = np.zeros(n_dmus + 1)
                c[0] = -1

                # Input constraints: sum(lambda_j * input_ij) <= input_ik
                A_ub = np.zeros((n_inputs, n_dmus + 1))
                A_ub[:, 1:] = self.inputs.T
                b_ub = self.inputs[k, :]

                # Output constraints: sum(lambda_j * output_rj) >= phi * output_rk
                # -> -sum(lambda_j * output_rj) + phi * output_rk <= 0
                A_ub_output = np.zeros((n_outputs, n_dmus + 1))
                A_ub_output[:, 1:] = -self.outputs.T
                A_ub_output[:, 0] = self.outputs[k, :]
                b_ub_output = np.zeros(n_outputs)
                
                A_ub = np.vstack([A_ub, A_ub_output])
                b_ub = np.concatenate([b_ub, b_ub_output])
                
                if rts == 'vrs':
                    A_eq = np.ones((1, n_dmus + 1))
                    A_eq[0, 0] = 0
                    b_eq = np.array([1])
                else: # CRS
                    A_eq = None
                    b_eq = None

                bounds = [(1, None)] + [(0, None) for _ in range(n_dmus)] # phi >= 1

                res = linprog(c, A_ub=A_ub, b_ub=b_ub, A_eq=A_eq, b_eq=b_eq, bounds=bounds, method='highs')

                if res.success:
                    phi = -res.fun
                    efficiencies[k] = 1/phi if phi != 0 else np.inf
                    lambdas_list.append(res.x[1:].tolist())
                else:
                    efficiencies[k] = np.nan
                    lambdas_list.append([np.nan] * n_dmus)
        
        # Prepare results
        efficiency_scores = {self.dmu_names[i]: eff for i, eff in enumerate(efficiencies)}
        lambdas = {self.dmu_names[i]: l for i, l in enumerate(lambdas_list)}
        reference_sets = {dmu: [self.dmu_names[j] for j, l_val in enumerate(lambdas_list[i]) if l_val > 1e-6]
                          for i, dmu in enumerate(self.dmu_names)}

        return efficiency_scores, lambdas, reference_sets


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
        
        # Ensure numeric types and positive values
        for col in input_cols + output_cols:
            df[col] = pd.to_numeric(df[col], errors='coerce')
            df.dropna(subset=[col], inplace=True)
            if (df[col] <= 0).any():
                raise ValueError(f"All values in input/output column '{col}' must be positive for DEA.")

        if df.empty:
             raise ValueError("No valid numeric data for analysis.")

        analyzer = DEAAnalyzer(df, input_cols, output_cols, dmu_col)
        efficiencies, lambdas, reference_sets = analyzer.analyze(orientation, rts)

        eff_scores = list(efficiencies.values())
        summary = {
            'total_dmus': len(df),
            'efficient_dmus': sum(1 for e in eff_scores if not np.isnan(e) and e >= 0.9999),
            'inefficient_dmus': sum(1 for e in eff_scores if not np.isnan(e) and e < 0.9999),
            'average_efficiency': np.nanmean(eff_scores) if eff_scores else 0
        }

        response = {
            'results': {
                'efficiency_scores': efficiencies,
                'reference_sets': reference_sets,
                'lambdas': lambdas,
                'summary': summary,
                'dmu_col': dmu_col,
                'dmu_names': analyzer.dmu_names, # Pass dmu_names for consistency
            }
        }
        
        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
