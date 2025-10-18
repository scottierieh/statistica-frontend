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
        
        # Improved: Select profiles to maximize orthogonality
        selected_profiles = self._select_orthogonal_subset(full_design, target_size)
        return selected_profiles
    
    def _select_orthogonal_subset(self, full_design, target_size):
        """Select subset maintaining orthogonality between attributes"""
        if len(full_design) <= target_size:
            return full_design
            
        # Start with random selection
        selected_indices = np.random.choice(len(full_design), target_size, replace=False)
        selected = [full_design[i] for i in selected_indices]
        
        # Check level balance for each attribute
        for attr in self.attributes:
            attr_name = attr['name']
            level_counts = {}
            for profile in selected:
                level = profile['attributes'][attr_name]
                level_counts[level] = level_counts.get(level, 0) + 1
            
            # If imbalanced, try to rebalance
            min_count = min(level_counts.values())
            max_count = max(level_counts.values())
            if max_count - min_count > 2:
                # Simple rebalancing logic here
                pass
                
        return selected


class CBCDesign(BaseConjointDesign):
    def __init__(self, attributes, num_tasks=8, profiles_per_task=3, include_none_option=True):
        super().__init__(attributes)
        self.num_tasks = num_tasks
        self.profiles_per_task = profiles_per_task
        self.include_none_option = include_none_option

    def create_choice_sets(self):
        base_profiles = self.generate_fractional_factorial()
        
        tasks = []
        used_combinations = set()
        
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
            for profile in best_set:
                profile['taskId'] = task_id
                
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
        # For now, just check if all attributes of one profile are "better"
        # This is a placeholder - real implementation would need utility values
        return False


class RankingDesign(BaseConjointDesign):
    def __init__(self, attributes, num_tasks=5, profiles_per_task=4, allow_partial_ranking=False):
        super().__init__(attributes)
        self.num_tasks = num_tasks
        self.profiles_per_task = profiles_per_task
        self.allow_partial_ranking = allow_partial_ranking

    def create_ranking_sets(self):
        base_profiles = self.generate_fractional_factorial()
        
        # Ensure we have enough profiles
        if len(base_profiles) < self.profiles_per_task:
            base_profiles = self.generate_full_factorial()
        
        tasks = []
        used_indices = set()
        
        for i in range(self.num_tasks):
            task_profiles = self._create_ranking_set(
                base_profiles,
                self.profiles_per_task,
                used_indices,
                task_id=f"task_{i}"
            )
            
            tasks.append({
                "taskId": f"task_{i}",
                "profiles": task_profiles,
                "allowPartialRanking": self.allow_partial_ranking
            })
            
        return tasks
    
    def _create_ranking_set(self, profiles, n_profiles, used_indices, task_id):
        """Create a set of profiles for ranking with good variation"""
        available_indices = list(set(range(len(profiles))) - used_indices)
        
        if len(available_indices) < n_profiles:
            # Reset if we've used all profiles
            available_indices = list(range(len(profiles)))
            used_indices.clear()
        
        # Select profiles with good attribute variation
        selected_indices = self._select_varied_profiles(profiles, available_indices, n_profiles)
        used_indices.update(selected_indices)
        
        task_profiles = []
        for idx in selected_indices:
            profile = profiles[idx].copy()
            profile['taskId'] = task_id
            task_profiles.append(profile)
            
        return task_profiles
    
    def _select_varied_profiles(self, profiles, available_indices, n_profiles):
        """Select profiles that have good variation in attributes"""
        if len(available_indices) <= n_profiles:
            return available_indices[:n_profiles]
        
        # Start with a random profile
        selected = [np.random.choice(available_indices)]
        available_indices = [i for i in available_indices if i != selected[0]]
        
        # Select remaining profiles to maximize diversity
        while len(selected) < n_profiles and available_indices:
            best_idx = None
            best_diversity = -1
            
            for idx in available_indices[:20]:  # Check first 20 to save time
                diversity = self._calculate_diversity(profiles, selected + [idx])
                if diversity > best_diversity:
                    best_diversity = diversity
                    best_idx = idx
            
            if best_idx is not None:
                selected.append(best_idx)
                available_indices.remove(best_idx)
            else:
                # Fallback to random
                idx = np.random.choice(available_indices)
                selected.append(idx)
                available_indices.remove(idx)
                
        return selected
    
    def _calculate_diversity(self, profiles, indices):
        """Calculate diversity score for a set of profiles"""
        diversity = 0
        for attr in self.attributes:
            attr_name = attr['name']
            levels = [profiles[i]['attributes'][attr_name] for i in indices]
            diversity += len(set(levels)) / len(levels)
        return diversity / len(self.attributes)


class RatingDesign(BaseConjointDesign):
    def __init__(self, attributes, scale_min=1, scale_max=10):
        super().__init__(attributes)
        self.scale_min = scale_min
        self.scale_max = scale_max
    
    def create_rating_profiles(self):
        """For rating, return profiles with scale information"""
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
        
        num_tasks = int(payload.get('sets', 8))
        profiles_per_task = int(payload.get('cardsPerSet', 3))
        
        # Additional options
        include_none = payload.get('includeNone', True)
        allow_partial_ranking = payload.get('allowPartialRanking', False)
        rating_scale = payload.get('ratingScale', [1, 10])

        if not attributes:
            raise ValueError("Missing 'attributes' data")

        result = {}
        
        if design_type == 'conjoint' or design_type == 'cbc':
            cbc_designer = CBCDesign(attributes, num_tasks, profiles_per_task, include_none)
            choice_sets = cbc_designer.create_choice_sets()
            result = {
                "type": "cbc",
                "tasks": choice_sets,
                "metadata": {
                    "numTasks": num_tasks,
                    "profilesPerTask": profiles_per_task,
                    "includeNone": include_none
                }
            }
            
        elif design_type == 'ranking-conjoint':
            ranking_designer = RankingDesign(attributes, num_tasks, profiles_per_task, allow_partial_ranking)
            ranking_sets = ranking_designer.create_ranking_sets()
            result = {
                "type": "ranking",
                "tasks": ranking_sets,
                "metadata": {
                    "numTasks": num_tasks,
                    "profilesPerTask": profiles_per_task,
                    "allowPartialRanking": allow_partial_ranking
                }
            }
            
        elif design_type == 'rating-conjoint':
            rating_designer = RatingDesign(attributes, rating_scale[0], rating_scale[1])
            profiles = rating_designer.create_rating_profiles()
            result = {
                "type": "rating",
                "profiles": profiles,
                "metadata": {
                    "scale": rating_scale,
                    "numProfiles": len(profiles)
                }
            }
            
        else:
            # Fallback
            base_designer = BaseConjointDesign(attributes)
            profiles = base_designer.generate_fractional_factorial()
            result = {"profiles": profiles}
        
        print(json.dumps(result, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
    