
import sys
import json
import pandas as pd
import numpy as np
import warnings
from sklearn.preprocessing import StandardScaler

warnings.filterwarnings('ignore')

def _to_native_type(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, (float, np.floating)):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, np.bool_):
        return bool(obj)
    return obj

def _create_design_matrix(df, attributes):
    X_list, feature_names, original_levels_map = [], [], {}
    
    for attr_name, props in attributes.items():
        if props['type'] == 'categorical':
            df[attr_name] = df[attr_name].astype('category')
            levels = df[attr_name].cat.categories
            original_levels_map[attr_name] = levels.tolist()
            
            # Effects coding
            for level in levels[:-1]:
                X_list.append((df[attr_name] == level).astype(int))
                feature_names.append(f"{attr_name}_{level}")
            
            X_list.append((df[attr_name] == levels[-1]).astype(int) * -1)
            feature_names.append(f"{attr_name}_{levels[-1]}")
            
    X = pd.concat(X_list, axis=1)
    X.columns = feature_names
    return X, original_levels_map

def run_hb_estimation(data, attributes, n_iterations=2500, n_burnin=500):
    df = pd.DataFrame(data)
    respondents = df['respondent_id'].unique()
    
    all_attrs = list(attributes.keys())
    
    # Create design matrix for all profiles
    design_matrix, levels_map = _create_design_matrix(df, attributes)

    # Prepare data structure for estimation
    choices = {}
    for resp_id in respondents:
        resp_data = df[df['respondent_id'] == resp_id]
        choices[resp_id] = []
        for task_id in resp_data['choice_set_id'].unique():
            task_df = resp_data[resp_data['choice_set_id'] == task_id]
            chosen_profile = task_df[task_df['chosen'] == 1].index[0]
            profile_indices = task_df.index.tolist()
            choices[resp_id].append({'chosen': chosen_profile, 'profiles': profile_indices})

    n_respondents = len(respondents)
    n_params = design_matrix.shape[1]

    # Priors for group-level parameters
    betas_mean = np.zeros(n_params)
    betas_cov = np.eye(n_params) * 10
    
    # Initialize individual-level betas
    betas = np.random.multivariate_normal(betas_mean, betas_cov, n_respondents)
    
    # MCMC iterations
    betas_posterior_draws = []

    for i in range(n_iterations):
        # 1. Update group-level parameters from individual betas
        betas_mean = np.mean(betas, axis=0)
        betas_cov = np.cov(betas, rowvar=False)
        if np.linalg.det(betas_cov) == 0:
            betas_cov += np.eye(n_params) * 1e-6
            
        # 2. Update individual-level betas (Metropolis-Hastings step)
        for r_idx, resp_id in enumerate(respondents):
            current_beta = betas[r_idx]
            
            # Propose new beta
            proposal_cov = betas_cov / 10 # Smaller covariance for proposal
            if np.linalg.det(proposal_cov) == 0:
                proposal_cov += np.eye(n_params) * 1e-6
            proposed_beta = np.random.multivariate_normal(current_beta, proposal_cov)
            
            # Calculate likelihood for current and proposed beta
            def log_likelihood(beta_vec):
                ll = 0
                for choice in choices[resp_id]:
                    utilities = design_matrix.loc[choice['profiles']].values @ beta_vec
                    exp_utilities = np.exp(utilities)
                    sum_exp_utilities = np.sum(exp_utilities)
                    
                    chosen_idx = choice['profiles'].index(choice['chosen'])
                    ll += utilities[chosen_idx] - np.log(sum_exp_utilities)
                return ll

            current_ll = log_likelihood(current_beta)
            proposed_ll = log_likelihood(proposed_beta)

            # Calculate priors
            current_l_prior = -0.5 * (current_beta - betas_mean).T @ np.linalg.inv(betas_cov) @ (current_beta - betas_mean)
            proposed_l_prior = -0.5 * (proposed_beta - betas_mean).T @ np.linalg.inv(betas_cov) @ (proposed_beta - betas_mean)

            # Acceptance probability
            log_acceptance_ratio = (proposed_ll + proposed_l_prior) - (current_ll + current_l_prior)
            
            if np.log(np.random.rand()) < log_acceptance_ratio:
                betas[r_idx] = proposed_beta

        if i >= n_burnin:
            betas_posterior_draws.append(betas.copy())

    # Final betas are the mean of posterior draws
    final_betas = np.mean(betas_posterior_draws, axis=0)
    
    return final_betas, design_matrix, levels_map, respondents


def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        attributes = payload.get('attributes')
        scenarios = payload.get('scenarios')
        
        if not data or not attributes:
            raise ValueError("Missing 'data' or 'attributes'")
        
        betas, design_matrix, levels_map, respondents = run_hb_estimation(data, attributes)
        
        # --- Process results ---
        part_worths_by_respondent = {}
        importance_by_respondent = {}

        for i, resp_id in enumerate(respondents):
            resp_betas = betas[i]
            part_worths = []
            
            coeff_idx = 0
            for attr, levels in levels_map.items():
                level_worths = []
                # First k-1 levels
                for level in levels[:-1]:
                    level_worths.append(resp_betas[coeff_idx])
                    part_worths.append({'attribute': attr, 'level': level, 'value': resp_betas[coeff_idx]})
                    coeff_idx += 1
                # Last level is sum of others * -1
                last_level_worth = -np.sum(level_worths)
                part_worths.append({'attribute': attr, 'level': levels[-1], 'value': last_level_worth})
            
            part_worths_by_respondent[resp_id] = part_worths
            
            # Importance
            attribute_ranges = {}
            for attr in attributes:
                worths = [pw['value'] for pw in part_worths if pw['attribute'] == attr]
                if worths:
                    attribute_ranges[attr] = max(worths) - min(worths)
            
            total_range = sum(attribute_ranges.values())
            importance = [{'attribute': attr, 'importance': (val / total_range) * 100} for attr, val in attribute_ranges.items()]
            importance.sort(key=lambda x: x['importance'], reverse=True)
            importance_by_respondent[resp_id] = importance


        # Aggregate results (mean across respondents)
        avg_part_worths = pd.DataFrame([item for sublist in part_worths_by_respondent.values() for item in sublist]).groupby(['attribute', 'level'])['value'].mean().reset_index().to_dict('records')
        
        avg_importance_df = pd.DataFrame([item for sublist in importance_by_respondent.values() for item in sublist])
        avg_importance = avg_importance_df.groupby('attribute')['importance'].mean().reset_index().sort_values('importance', ascending=False).to_dict('records')
        
        final_results = {
            'partWorths': avg_part_worths,
            'importance': avg_importance,
            'respondentLevel': {
                'partWorths': part_worths_by_respondent,
                'importance': importance_by_respondent
            },
            'regression': { 'rSquared': None, 'modelType': 'Hierarchical Bayes Logit'},
            'simulation': None
        }

        print(json.dumps({'results': final_results}, default=_to_native_type))

    except Exception as e:
        import traceback
        print(json.dumps({"error": str(e), "trace": traceback.format_exc()}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
