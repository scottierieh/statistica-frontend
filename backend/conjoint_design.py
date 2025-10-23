
import sys
import json
import pandas as pd
import numpy as np
from itertools import product, combinations
import warnings
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer

warnings.filterwarnings('ignore')

def generate_full_factorial(attributes):
    levels = [v for k, v in attributes.items()]
    return pd.DataFrame(list(product(*levels)), columns=attributes.keys())

def generate_fractional_factorial(attributes):
    full_factorial = generate_full_factorial(attributes)
    
    # Improved fractional factorial selection logic
    n_total = len(full_factorial)
    if n_total <= 32: # For smaller designs, keep more profiles
        fraction_size = n_total
    else:
        fraction_size = int(np.ceil(n_total / 4))
    
    # Try to make it a power of 2 for better orthogonality, if possible, or just take a sample
    power_of_2 = 2**np.ceil(np.log2(fraction_size))
    if power_of_2 <= n_total and power_of_2 >= 8:
        fraction_size = int(power_of_2)
    else:
        fraction_size = max(8, min(fraction_size, n_total))
        
    return full_factorial.sample(n=fraction_size, random_state=42).reset_index(drop=True)

def generate_balanced_overlap(attributes, profiles_per_task, n_tasks):
    full_factorial = generate_full_factorial(attributes)
    
    # Check if there are enough profiles for the design
    if len(full_factorial) < profiles_per_task:
        raise ValueError(
            f"Not enough unique profiles ({len(full_factorial)}) to generate tasks with {profiles_per_task} profiles each. "
            "Reduce profiles per task or add more attribute levels."
        )
        
    tasks = []
    
    # Try to create diverse tasks
    used_profiles = set()
    for _ in range(n_tasks):
        available_profiles = full_factorial[~full_factorial.index.isin(list(used_profiles))]
        if len(available_profiles) < profiles_per_task:
            # If we run out of unused profiles, sample from all profiles
            available_profiles = full_factorial
        
        sample_df = available_profiles.sample(n=profiles_per_task, random_state=None)
        tasks.append(sample_df.to_dict('records'))
        used_profiles.update(sample_df.index)

    return tasks


def main():
    try:
        payload = json.load(sys.stdin)
        attributes = payload.get('attributes', {})
        design_method = payload.get('designMethod', 'fractional-factorial')
        sets = int(payload.get('sets', 1))
        cards_per_set = int(payload.get('cardsPerSet', 3))

        if not attributes:
            raise ValueError("Attributes dictionary is empty.")

        if design_method == 'full-factorial':
            design = generate_full_factorial(attributes)
            profiles = design.to_dict('records')
        elif design_method == 'fractional-factorial':
            design = generate_fractional_factorial(attributes)
            profiles = design.to_dict('records')
        elif design_method == 'balanced-overlap':
            profiles = generate_balanced_overlap(attributes, cards_per_set, sets)
        else:
            raise ValueError(f"Unknown design method: {design_method}")

        response = {"design": profiles}
        print(json.dumps(response))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
