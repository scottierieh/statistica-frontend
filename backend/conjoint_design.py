import sys
import json
import numpy as np
import pandas as pd
from itertools import product
import warnings

warnings.filterwarnings('ignore')

def _to_native_type(obj):
    if isinstance(obj, np.integer): return int(obj)
    if isinstance(obj, np.floating): return float(obj)
    if isinstance(obj, np.ndarray): return obj.tolist()
    return obj

class ConjointDesignGenerator:
    @staticmethod
    def generate_full_factorial(attributes):
        if not attributes:
            return []
        
        levels_by_attr = [attr['levels'] for attr in attributes]
        attribute_names = [attr['name'] for attr in attributes]
        
        combinations = list(product(*levels_by_attr))
        
        profiles = []
        for i, combo in enumerate(combinations):
            profiles.append({
                "id": f"ff_{i+1}",
                "attributes": dict(zip(attribute_names, combo))
            })
        return profiles

    @staticmethod
    def select_d_optimal_profiles(full_design, target_size, attributes):
        if len(full_design) <= target_size:
            return full_design

        selected_indices = list(np.random.choice(len(full_design), target_size, replace=False))
        selected_profiles = [full_design[i] for i in selected_indices]
        
        return selected_profiles


    @staticmethod
    def generate_fractional_factorial(attributes):
        full_design = ConjointDesignGenerator.generate_full_factorial(attributes)
        total_levels = sum(len(attr['levels']) for attr in attributes)
        min_profiles = total_levels - len(attributes) + 1
        target_size = min(len(full_design), max(min_profiles * 2, 16))
        
        return ConjointDesignGenerator.select_d_optimal_profiles(full_design, int(target_size), attributes)
        
    @staticmethod
    def generate_orthogonal_design(attributes):
        # This is a simplified placeholder. Real orthogonal design is complex.
        # For a production system, a dedicated library like `oapackage` would be better.
        return ConjointDesignGenerator.generate_fractional_factorial(attributes)

    @staticmethod
    def calculate_design_statistics(profiles, attributes):
        if not profiles: return {}
            
        total_combinations = np.prod([len(attr['levels']) for attr in attributes])
        
        # Balance
        balance_scores = []
        for attr in attributes:
            level_counts = {level: 0 for level in attr['levels']}
            for profile in profiles:
                level = profile['attributes'][attr['name']]
                if level in level_counts:
                    level_counts[level] += 1
            
            counts = list(level_counts.values())
            expected = len(profiles) / len(attr['levels'])
            deviation = sum(abs(c - expected) for c in counts)
            balance_scores.append(1 - (deviation / (2 * len(profiles) * (1 - 1/len(attr['levels'])))))

        # Orthogonality (simplified)
        orthogonality_scores = []
        for i in range(len(attributes)):
            for j in range(i + 1, len(attributes)):
                attr1 = attributes[i]
                attr2 = attributes[j]
                
                pair_counts = {(l1, l2): 0 for l1 in attr1['levels'] for l2 in attr2['levels']}
                for profile in profiles:
                    l1 = profile['attributes'][attr1['name']]
                    l2 = profile['attributes'][attr2['name']]
                    if (l1, l2) in pair_counts:
                        pair_counts[(l1, l2)] += 1
                
                counts = np.array(list(pair_counts.values()))
                orthogonality_scores.append(1 - np.std(counts) / np.mean(counts))

        return {
            "totalProfiles": len(profiles),
            "totalPossibleCombinations": int(total_combinations),
            "reductionRatio": (1 - len(profiles) / total_combinations) * 100 if total_combinations > 0 else 0,
            "balance": np.mean(balance_scores) * 100 if balance_scores else 100,
            "orthogonality": np.mean(orthogonality_scores) * 100 if orthogonality_scores else 100
        }

def main():
    try:
        payload = json.load(sys.stdin)
        attributes = payload.get('attributes')
        design_method = payload.get('design_method', 'fractional-factorial')

        if not attributes:
            raise ValueError("Missing 'attributes' data")

        profiles = []
        if design_method == 'full-factorial':
            profiles = ConjointDesignGenerator.generate_full_factorial(attributes)
        elif design_method == 'orthogonal':
            profiles = ConjointDesignGenerator.generate_orthogonal_design(attributes)
        else: # Default to fractional
            profiles = ConjointDesignGenerator.generate_fractional_factorial(attributes)
        
        statistics = ConjointDesignGenerator.calculate_design_statistics(profiles, attributes)

        response = {
            "profiles": profiles,
            "statistics": statistics
        }
        
        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
