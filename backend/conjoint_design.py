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

    def generate_fractional_factorial(self, target_size=None):
        full_design_dicts = self.generate_full_factorial()
        
        if not target_size:
            total_levels = sum(len(attr['levels']) for attr in self.attributes)
            min_profiles = total_levels - len(self.attributes) + 1
            target_size = min(len(full_design_dicts), max(min_profiles, 16))

        if len(full_design_dicts) <= target_size:
            return full_design_dicts
        
        # Convert dicts to a more usable format for calculation
        full_design_df = pd.DataFrame([p['attributes'] for p in full_design_dicts])
        
        # Select profiles to maximize orthogonality
        selected_indices = self._select_orthogonal_subset(full_design_df, target_size)
        
        # Return the selected profiles as dicts
        return [full_design_dicts[i] for i in selected_indices]
    
    def _select_orthogonal_subset(self, design_df, target_size):
        """
        Selects a subset of profiles that maximizes orthogonality and balance.
        This is a heuristic approach, not a formal orthogonal array generator.
        """
        num_profiles = len(design_df)
        
        # Start with a random set of indices
        np.random.seed(42)
        selected_indices = list(np.random.choice(num_profiles, target_size, replace=False))
        
        # Iteratively improve the selection
        max_iterations = 100 
        for _ in range(max_iterations):
            current_score = self._calculate_design_score(design_df.iloc[selected_indices])
            
            # Try swapping one profile
            potential_swap_in_idx = np.random.choice(list(set(range(num_profiles)) - set(selected_indices)))
            swap_out_idx_pos = np.random.choice(len(selected_indices))
            
            temp_indices = selected_indices.copy()
            temp_indices[swap_out_idx_pos] = potential_swap_in_idx
            
            new_score = self._calculate_design_score(design_df.iloc[temp_indices])
            
            if new_score > current_score:
                selected_indices = temp_indices
                
        return selected_indices

    def _calculate_design_score(self, subset_df):
        """
        Calculates a score based on level balance and 2-way orthogonality.
        Higher score is better.
        """
        score = 0
        
        # 1. Level Balance Score
        for col in subset_df.columns:
            counts = subset_df[col].value_counts(normalize=True)
            # Penalize deviation from perfect balance
            perfect_balance = 1 / len(counts)
            balance_penalty = np.sum((counts - perfect_balance)**2)
            score -= balance_penalty

        # 2. Orthogonality Score (for pairs of attributes)
        for i in range(len(subset_df.columns)):
            for j in range(i + 1, len(subset_df.columns)):
                col1 = subset_df.columns[i]
                col2 = subset_df.columns[j]
                
                crosstab = pd.crosstab(subset_df[col1], subset_df[col2])
                
                # Chi-squared test for independence
                from scipy.stats import chi2_contingency
                try:
                    chi2, p, _, _ = chi2_contingency(crosstab)
                    # We want p to be high (independent), so we reward high p-values
                    if not np.isnan(p):
                        score += p 
                except ValueError:
                    # Occurs if a row/column sum is 0
                    pass

        return score


class CBCDesign(BaseConjointDesign):
    def __init__(self, attributes, num_tasks=8, profiles_per_task=3, include_none_option=True):
        super().__init__(attributes)
        self.num_tasks = num_tasks
        self.profiles_per_task = profiles_per_task
        self.include_none_option = include_none_option

    def create_choice_sets(self, design_method='fractional-factorial'):
        if design_method == 'full-factorial':
            base_profiles = self.generate_full_factorial()
        else:
            base_profiles = self.generate_fractional_factorial()
        
        tasks = []
        used_combinations = set()
        
        # Ensure we have enough unique profiles for the number of tasks
        if len(base_profiles) < self.num_tasks * self.profiles_per_task:
            warnings.warn("Not enough unique profiles for all tasks. Profiles may be repeated across tasks.")
            # Duplicate profiles to meet task requirements
            while len(base_profiles) < self.num_tasks * self.profiles_per_task:
                base_profiles.extend(base_profiles)

        for i in range(self.num_tasks):
            task_profiles = self._create_balanced_choice_set(
                base_profiles, 
                self.profiles_per_task,
                used_combinations,
                task_id=f"task_{i}"
            )
            
            # Add none option if configured
            if self.include_none_option:
                none_profile = {
                    "id": f"none_{i}",
                    "taskId": f"task_{i}",
                    "attributes": {"type": "none"},
                    "isNoneOption": True
                }
                task_profiles.append(none_profile)
            
            tasks.append({
                "taskId": f"task_{i}",
                "profiles": task_profiles
            })
            
        return tasks
    
    def _create_balanced_choice_set(self, profiles, n_profiles, used_combinations, task_id):
        """Create a choice set with balanced attribute levels and minimal overlap"""
        max_attempts = 100
        best_set = None
        best_score = -1
        
        for _ in range(max_attempts):
            # Randomly select profiles
            indices = np.random.choice(len(profiles), n_profiles, replace=False)
            candidate_set = [profiles[i].copy() for i in indices]
            
            # Check if this combination was used before
            combo_key = tuple(sorted([p['id'] for p in candidate_set]))
            if combo_key in used_combinations:
                continue
            
            # Calculate balance score
            score = self._calculate_balance_score(candidate_set)
            
            # Check for dominance (one clearly better option)
            if not self._has_clear_dominance(candidate_set):
                score += 0.5  # Bonus for no dominance
            
            if score > best_score:
                best_score = score
                best_set = candidate_set
                
        # Mark this combination as used
        if best_set:
            combo_key = tuple(sorted([p['id'] for p in best_set]))
            used_combinations.add(combo_key)
            
            # Add task ID to each profile
            for i, profile in enumerate(best_set):
                profile['taskId'] = task_id
                profile['id'] = f"{task_id}_profile_{i}"
                
        return best_set or [profiles[i].copy() for i in np.random.choice(len(profiles), n_profiles, replace=False)]
    
    def _calculate_balance_score(self, choice_set):
        """Calculate how well balanced the attribute levels are within a choice set"""
        score = 0
        for attr in self.attributes:
            attr_name = attr['name']
            levels_in_set = [p['attributes'][attr_name] for p in choice_set]
            # Prefer sets where each level appears at most once (minimal overlap)
            unique_levels = len(set(levels_in_set))
            score += unique_levels / len(levels_in_set)
        return score / len(self.attributes)
    
    def _has_clear_dominance(self, choice_set):
        """Check if one profile clearly dominates others"""
        # Simplified dominance check - in practice, you'd use utility estimates
        # This is a placeholder - real implementation would need utility values
        return False


class RankingDesign(BaseConjointDesign):
    def __init__(self, attributes, num_tasks=5, profiles_per_task=4, allow_partial_ranking=False):
        super().__init__(attributes)
        self.num_tasks = num_tasks
        self.profiles_per_task = profiles_per_task
        self.allow_partial_ranking = allow_partial_ranking

    def create_ranking_sets(self, design_method='fractional-factorial'):
        if design_method == 'full-factorial':
            base_profiles = self.generate_full_factorial()
            
            # For full factorial ranking, often present all profiles in one go if feasible
            return [{
                "taskId": "task_0",
                "profiles": base_profiles,
                "allowPartialRanking": self.allow_partial_ranking
            }]
        
        else: # Fractional factorial
            base_profiles = self.generate_fractional_factorial()
            
            # Ensure we have enough profiles
            if len(base_profiles) < self.profiles_per_task * self.num_tasks:
                 base_profiles = self.generate_fractional_factorial(
                     target_size = self.profiles_per_task * self.num_tasks
                 )

            tasks = []
            used_indices = set()
            
            profile_pool = base_profiles.copy()
            np.random.shuffle(profile_pool)
            
            for i in range(self.num_tasks):
                if len(profile_pool) < self.profiles_per_task:
                    break # Not enough profiles left
                    
                task_profiles_raw = profile_pool[:self.profiles_per_task]
                profile_pool = profile_pool[self.profiles_per_task:]

                task_profiles = []
                for j, profile in enumerate(task_profiles_raw):
                    new_profile = profile.copy()
                    new_profile['taskId'] = f"task_{i}"
                    new_profile['id'] = f"{new_profile['taskId']}_profile_{j}"
                    task_profiles.append(new_profile)

                tasks.append({
                    "taskId": f"task_{i}",
                    "profiles": task_profiles,
                    "allowPartialRanking": self.allow_partial_ranking
                })
            return tasks


class RatingDesign(BaseConjointDesign):
    def __init__(self, attributes, scale_min=1, scale_max=10):
        super().__init__(attributes)
        self.scale_min = scale_min
        self.scale_max = scale_max
    
    def create_rating_profiles(self, design_method='fractional-factorial'):
        """For rating, return profiles with scale information"""
        if design_method == 'full-factorial':
            profiles = self.generate_full_factorial()
        else:
            profiles = self.generate_fractional_factorial()
        
        # Add scale information to each profile
        for i, profile in enumerate(profiles):
            profile['taskId'] = f"task_{i}"
            profile['scale'] = {
                "min": self.scale_min,
                "max": self.scale_max,
                "type": "rating"
            }
            
        return profiles


def main():
    try:
        payload = json.load(sys.stdin)
        attributes = payload.get('attributes')
        design_type = payload.get('designType', 'cbc')
        
        # Common options
        design_method = payload.get('designMethod', 'fractional-factorial')
        
        # CBC/Ranking options
        num_tasks = int(payload.get('numTasks', 8))
        profiles_per_task = int(payload.get('profilesPerTask', 3))
        
        # CBC specific
        include_none = payload.get('includeNone', True)

        # Ranking specific
        allow_partial_ranking = payload.get('allowPartialRanking', False)

        # Rating specific
        rating_scale = payload.get('ratingScale', [1, 10])

        if not attributes:
            raise ValueError("Missing 'attributes' data")

        result = {}
        
        if design_type == 'cbc':
            cbc_designer = CBCDesign(attributes, num_tasks, profiles_per_task, include_none)
            tasks = cbc_designer.create_choice_sets(design_method)
            result = {
                "type": "cbc",
                "tasks": tasks,
                "metadata": { "numTasks": len(tasks), "profilesPerTask": profiles_per_task, "includeNone": include_none }
            }
            
        elif design_type == 'ranking-conjoint':
            ranking_designer = RankingDesign(attributes, num_tasks, profiles_per_task, allow_partial_ranking)
            tasks = ranking_designer.create_ranking_sets(design_method)
            result = {
                "type": "ranking",
                "tasks": tasks,
                "metadata": { "numTasks": len(tasks), "profilesPerTask": profiles_per_task, "allowPartialRanking": allow_partial_ranking }
            }
            
        elif design_type == 'rating-conjoint':
            rating_designer = RatingDesign(attributes, rating_scale[0], rating_scale[1])
            profiles = rating_designer.create_rating_profiles(design_method)
            # For rating, tasks are just single profiles
            tasks = [{"taskId": f"task_{i}", "profiles": [p]} for i, p in enumerate(profiles)]
            result = {
                "type": "rating",
                "tasks": tasks, # Consistent structure
                "profiles": profiles, # For backward compatibility if needed
                "metadata": { "scale": rating_scale, "numProfiles": len(profiles) }
            }
            
        else:
            base_designer = BaseConjointDesign(attributes)
            profiles = base_designer.generate_fractional_factorial()
            result = {"profiles": profiles}
        
        print(json.dumps(result, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()

    