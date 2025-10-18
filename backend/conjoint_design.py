
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
            # 전체 조합 수
            total_combinations = len(full_design_dicts)
            
            # 각 속성의 수준 수 합계
            total_levels = sum(len(attr['levels']) for attr in self.attributes)
            
            # 최소 필요 프로파일 수 (main effects 추정을 위한 최소값)
            min_profiles = total_levels - len(self.attributes) + 1
            
            # Fractional factorial의 경우 전체의 1/2 ~ 2/3 정도를 사용
            if total_combinations <= 9:
                target_size = total_combinations  # 작으면 전체 사용
            elif total_combinations <= 27:
                target_size = max(min_profiles, total_combinations // 2)  # 절반 사용
            else:
                target_size = min(total_combinations, max(min_profiles, 20)) # Increase max default
        
        print(f"Debug: Total combinations: {len(full_design_dicts)}, Target size: {target_size}", file=sys.stderr)

        if len(full_design_dicts) <= target_size:
            return full_design_dicts
        
        full_design_df = pd.DataFrame([p['attributes'] for p in full_design_dicts])
        selected_indices = self._select_orthogonal_subset(full_design_df, target_size)
        return [full_design_dicts[i] for i in selected_indices]

    def _select_orthogonal_subset(self, design_df, target_size):
        num_profiles = len(design_df)
        if target_size >= num_profiles:
            return list(range(num_profiles))
        
        np.random.seed(42)
        selected_indices = list(np.random.choice(num_profiles, target_size, replace=False))
        
        max_iterations = 200 # Increased iterations
        best_score = self._calculate_design_score(design_df.iloc[selected_indices])
        
        for _ in range(max_iterations):
            current_score = best_score
            
            potential_swap_in_idx = np.random.choice(list(set(range(num_profiles)) - set(selected_indices)))
            swap_out_idx_pos = np.random.choice(len(selected_indices))
            
            temp_indices = selected_indices.copy()
            original_index_to_replace = temp_indices[swap_out_idx_pos]
            temp_indices[swap_out_idx_pos] = potential_swap_in_idx
            
            new_score = self._calculate_design_score(design_df.iloc[temp_indices])
            
            # Use simulated annealing like approach to escape local minima
            if new_score > best_score or np.random.rand() < 0.1:
                best_score = new_score
                selected_indices = temp_indices
                
        return selected_indices

    def _calculate_design_score(self, subset_df):
        score = 0.0
        
        # 1. Level Balance Score
        for col in subset_df.columns:
            counts = subset_df[col].value_counts(normalize=True)
            if not counts.empty:
                balance_penalty = np.sum((counts - (1 / len(counts)))**2)
                score -= balance_penalty

        # 2. Orthogonality Score (for pairs of attributes)
        from scipy.stats import chi2_contingency
        for i in range(len(subset_df.columns)):
            for j in range(i + 1, len(subset_df.columns)):
                crosstab = pd.crosstab(subset_df.iloc[:, i], subset_df.iloc[:, j])
                
                # Chi-squared test for independence
                try:
                    if crosstab.sum().sum() > 0 and all(crosstab.sum(axis=0) > 0) and all(crosstab.sum(axis=1) > 0):
                        chi2, p, _, _ = chi2_contingency(crosstab)
                        if not np.isnan(p):
                            score += p # Reward high p-values (independence)
                    else:
                        score -= 1 # Penalize if table is sparse
                except ValueError:
                    score -= 1 # Penalize if crosstab is invalid

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
        
        if len(base_profiles) < self.num_tasks * self.profiles_per_task:
            warnings.warn("Not enough unique profiles for all tasks. Profiles may be repeated across tasks.")
            while len(base_profiles) < self.num_tasks * self.profiles_per_task:
                base_profiles.extend(base_profiles)

        for i in range(self.num_tasks):
            task_profiles = self._create_balanced_choice_set(
                base_profiles, 
                self.profiles_per_task,
                used_combinations,
                task_id=f"task_{i}"
            )
            
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
        max_attempts = 100
        best_set = None
        best_score = -1
        
        for _ in range(max_attempts):
            indices = np.random.choice(len(profiles), n_profiles, replace=False)
            candidate_set = [profiles[i].copy() for i in indices]
            
            combo_key = tuple(sorted([p['id'] for p in candidate_set]))
            if combo_key in used_combinations:
                continue
            
            score = self._calculate_balance_score(candidate_set)
            
            if not self._has_clear_dominance(candidate_set):
                score += 0.5
            
            if score > best_score:
                best_score = score
                best_set = candidate_set
                
        if best_set:
            combo_key = tuple(sorted([p['id'] for p in best_set]))
            used_combinations.add(combo_key)
            
            for i, profile in enumerate(best_set):
                profile['taskId'] = task_id
                profile['id'] = f"{task_id}_profile_{i}"
                
        return best_set or [profiles[i].copy() for i in np.random.choice(len(profiles), n_profiles, replace=False)]
    
    def _calculate_balance_score(self, choice_set):
        score = 0
        for attr in self.attributes:
            attr_name = attr['name']
            levels_in_set = [p['attributes'][attr_name] for p in choice_set]
            unique_levels = len(set(levels_in_set))
            score += unique_levels / len(levels_in_set)
        return score / len(self.attributes)
    
    def _has_clear_dominance(self, choice_set):
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
            return [{
                "taskId": "task_0",
                "profiles": base_profiles,
                "allowPartialRanking": self.allow_partial_ranking
            }]
        
        else:
            target_profile_count = self.num_tasks * self.profiles_per_task
            base_profiles = self.generate_fractional_factorial(target_size=target_profile_count)
            
            tasks = []
            profile_pool = base_profiles.copy()
            np.random.shuffle(profile_pool)
            
            for i in range(self.num_tasks):
                if len(profile_pool) < self.profiles_per_task:
                    break 
                    
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
    
    def create_rating_profiles(self, design_method='fractional-factorial', target_size=None):
        if design_method == 'full-factorial':
            profiles = self.generate_full_factorial()
        else:
            profiles = self.generate_fractional_factorial(target_size=target_size)
        
        print(f"Generated {len(profiles)} profiles for rating conjoint", file=sys.stderr)
        
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
        
        design_method = payload.get('designMethod', 'fractional-factorial')
        
        # CBC/Ranking options
        num_tasks = int(payload.get('numTasks', 8))
        profiles_per_task = int(payload.get('profilesPerTask', 3))
        
        # Rating specific
        target_size = payload.get('target_size')
        rating_scale = payload.get('ratingScale', [1, 10])

        if not attributes:
            raise ValueError("Missing 'attributes' data")

        result = {}
        
        if design_type == 'cbc':
            cbc_designer = CBCDesign(attributes, num_tasks, profiles_per_task, payload.get('includeNone', True))
            tasks = cbc_designer.create_choice_sets(design_method)
            result = {"type": "cbc", "tasks": tasks, "metadata": { "numTasks": len(tasks), "profilesPerTask": profiles_per_task, "includeNone": payload.get('includeNone', True) }}
            
        elif design_type == 'ranking-conjoint':
            ranking_designer = RankingDesign(attributes, num_tasks, profiles_per_task, payload.get('allowPartialRanking', False))
            tasks = ranking_designer.create_ranking_sets(design_method)
            result = {"type": "ranking", "tasks": tasks, "metadata": { "numTasks": len(tasks), "profilesPerTask": profiles_per_task, "allowPartialRanking": payload.get('allowPartialRanking', False) }}
            
        elif design_type == 'rating-conjoint':
            rating_designer = RatingDesign(attributes, rating_scale[0], rating_scale[1])
            profiles = rating_designer.create_rating_profiles(design_method, target_size=target_size)
            result = {"type": "rating", "profiles": profiles, "metadata": { "scale": rating_scale, "numProfiles": len(profiles) }}
            
        else:
            base_designer = BaseConjointDesign(attributes)
            profiles = base_designer.generate_fractional_factorial(target_size=target_size)
            result = {"profiles": profiles}
        
        print(json.dumps(result, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
