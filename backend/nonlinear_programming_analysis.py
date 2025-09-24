
import sys
import json
import numpy as np
from scipy.optimize import minimize
import warnings

warnings.filterwarnings('ignore')

def _to_native_type(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, (np.floating, float)):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    return obj

def main():
    try:
        payload = json.load(sys.stdin)
        objective_str = payload.get('objective_str')
        initial_guess_str = payload.get('initial_guess')
        bounds_str = payload.get('bounds')
        constraints_str = payload.get('constraints')
        method = payload.get('method', 'SLSQP')

        if not all([objective_str, initial_guess_str]):
            raise ValueError("Objective function and initial guess are required.")

        # --- DYNAMICALLY DEFINE FUNCTIONS AND CONSTRAINTS FROM STRINGS ---
        # This is a security risk in a production environment, but necessary for this tool's flexibility.
        
        # Define objective function
        def objective(x):
            return eval(objective_str, {"np": np, "x": x})

        # Parse initial guess
        initial_guess = eval(initial_guess_str, {"np": np})

        # Parse bounds
        bounds = None
        if bounds_str:
            bounds = eval(bounds_str, {"np": np})
            if len(bounds) != len(initial_guess):
                 raise ValueError("The number of bounds must match the number of variables.")


        # Parse constraints
        constraints = []
        if constraints_str:
            try:
                constraints_list = eval(constraints_str, {"np": np})
                if not isinstance(constraints_list, list):
                    raise ValueError("Constraints must be a list of dictionaries.")
                
                for const in constraints_list:
                    if not all(k in const for k in ['type', 'fun']):
                        raise ValueError("Each constraint must have a 'type' and 'fun' key.")
                    
                    # Create a lambda function from the string in 'fun'
                    const['fun'] = eval(const['fun'], {"np": np})

                constraints = constraints_list

            except Exception as e:
                raise ValueError(f"Error parsing constraints: {e}")

        # --- PERFORM OPTIMIZATION ---
        result = minimize(objective, initial_guess, method=method, bounds=bounds, constraints=constraints)

        # --- PREPARE RESPONSE ---
        response = {
            "success": bool(result.success),
            "message": str(result.message),
            "solution": result.x.tolist() if hasattr(result.x, 'tolist') else result.x,
            "optimal_value": float(result.fun) if hasattr(result, 'fun') else None,
            "iterations": int(result.nit) if hasattr(result, 'nit') else None,
        }
        
        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
