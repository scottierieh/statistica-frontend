import sys
import json
import numpy as np
import pandas as pd
from itertools import product, combinations
import warnings

warnings.filterwarnings('ignore')

def _to_native_type(obj):
    if isinstance(obj, np.integer): return int(obj)
    if isinstance(obj, np.floating): return float(obj)
    if isinstance(obj, np.ndarray): return obj.tolist()
    return obj

class BaseConjointDesign:
    def __init__(self, attributes):
        self.attributes = attributes

    def generate_full_factorial(self):
        if not self.attributes:
            return []
        
        levels_by_attr = [attr['levels'] for attr in self.attributes]
        attribute_names = [attr['name'] for attr in self.attributes]
        
        design = list(product(*levels_by_attr))
        
        profiles = []
        for i, combo in enumerate(design):
            profiles.append({
                "id": f"ff_{i+1}",
                "attributes": dict(zip(attribute_names, combo))
            })
        return profiles

    def generate_fractional_factorial(self):
        full_design = self.generate_full_factorial()
        total_levels = sum(len(attr['levels']) for attr in self.attributes)
        min_profiles = total_levels - len(self.attributes) + 1
        
        # Ensure target size is reasonable
        target_size = min(len(full_design), max(min_profiles * 2, 16, len(self.attributes) * 3))
        
        if len(full_design) <= target_size:
            return full_design
        
        # Simple random selection as a placeholder for D-optimal
        selected_indices = np.random.choice(len(full_design), int(target_size), replace=False)
        return [full_design[i] for i in selected_indices]


class CBCDesign(BaseConjointDesign):
    def __init__(self, attributes, num_tasks=8, profiles_per_task=3):
        super().__init__(attributes)
        self.num_tasks = num_tasks
        self.profiles_per_task = profiles_per_task

    def create_choice_sets(self):
        base_profiles = self.generate_fractional_factorial()
        np.random.shuffle(base_profiles)
        
        tasks = []
        for i in range(self.num_tasks):
            # Simple random sampling for choice sets
            chosen_profiles = np.random.choice(len(base_profiles), self.profiles_per_task, replace=False)
            task_profiles = [base_profiles[j] for j in chosen_profiles]
            
            # Assign task ID to each profile
            for profile in task_profiles:
                profile['taskId'] = f"task_{i}"
            tasks.extend(task_profiles)
            
        return tasks

class RankingDesign(BaseConjointDesign):
    def __init__(self, attributes, num_tasks=5, profiles_per_task=4):
        super().__init__(attributes)
        self.num_tasks = num_tasks
        self.profiles_per_task = profiles_per_task

    def create_ranking_sets(self):
        base_profiles = self.generate_fractional_factorial()
        np.random.shuffle(base_profiles)
        
        tasks = []
        for i in range(self.num_tasks):
            start_idx = (i * self.profiles_per_task) % len(base_profiles)
            task_profiles = [base_profiles[(start_idx + j) % len(base_profiles)] for j in range(self.profiles_per_task)]
            
            for profile in task_profiles:
                profile['taskId'] = f"task_{i}"
            tasks.extend(task_profiles)
            
        return tasks

class RatingDesign(BaseConjointDesign):
    def create_rating_profiles(self):
        # For rating, we can just use a fractional factorial set
        return self.generate_fractional_factorial()


def main():
    try:
        payload = json.load(sys.stdin)
        attributes = payload.get('attributes')
        design_type = payload.get('designType', 'cbc') # 'cbc', 'rating', 'ranking'
        
        num_tasks = int(payload.get('sets', 8))
        profiles_per_task = int(payload.get('cardsPerSet', 3))

        if not attributes:
            raise ValueError("Missing 'attributes' data")

        profiles = []
        if design_type == 'conjoint': # This is CBC
            cbc_designer = CBCDesign(attributes, num_tasks, profiles_per_task)
            profiles = cbc_designer.create_choice_sets()
        elif design_type == 'ranking-conjoint':
            ranking_designer = RankingDesign(attributes, num_tasks, profiles_per_task)
            profiles = ranking_designer.create_ranking_sets()
        elif design_type == 'rating-conjoint':
            rating_designer = RatingDesign(attributes)
            base_profiles = rating_designer.create_rating_profiles()
            # For rating, each profile can be its own task
            profiles = []
            for i, profile in enumerate(base_profiles):
                profile['taskId'] = f"task_{i}"
                profiles.append(profile)
        else:
            # Default or fallback
            base_designer = BaseConjointDesign(attributes)
            profiles = base_designer.generate_fractional_factorial()

        response = { "profiles": profiles }
        
        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
