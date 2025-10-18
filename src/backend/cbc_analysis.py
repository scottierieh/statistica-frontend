import sys
import json
import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import log_loss
import warnings
from scipy.optimize import minimize
from scipy.special import softmax

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

class MultinomialLogit:
    """
    Multinomial Logit Model for Choice-Based Conjoint Analysis
    """
    def __init__(self, fit_intercept=True):
        self.fit_intercept = fit_intercept
        self.coef_ = None
        self.intercept_ = None
        self.converged_ = False
        
    def _create_choice_sets(self, df, choice_col='chosen'):
        """
        Create choice sets from the data
        Each choice set contains alternatives where one is chosen (1) and others are not (0)
        """
        # Assume that data is organized by choice sets
        # We need to identify choice sets - typically by respondent and task/scenario
        if 'respondent_id' in df.columns and 'task_id' in df.columns:
            choice_sets = df.groupby(['respondent_id', 'task_id'])
        elif 'choice_set_id' in df.columns:
            choice_sets = df.groupby('choice_set_id')
        else:
            # If no explicit choice set identifiers, assume sequential grouping
            # This assumes alternatives are grouped together
            n_alternatives = (df[choice_col] == 1).sum() / df[choice_col].sum() if df[choice_col].sum() > 0 else 3
            n_alternatives = max(2, int(n_alternatives))
            df['choice_set_id'] = np.repeat(range(len(df) // n_alternatives), n_alternatives)[:len(df)]
            choice_sets = df.groupby('choice_set_id')
        
        return choice_sets
    
    def _log_likelihood(self, params, X_sets, y_sets):
        """
        Calculate negative log-likelihood for MNL model
        """
        ll = 0
        
        for X_set, y_set in zip(X_sets, y_sets):
            # Calculate utilities for all alternatives in the choice set
            if self.fit_intercept:
                utilities = X_set @ params[1:] + params[0]
            else:
                utilities = X_set @ params
            
            # Calculate probabilities using softmax
            probs = softmax(utilities)
            
            # Add log probability of the chosen alternative
            chosen_idx = np.where(y_set == 1)[0]
            if len(chosen_idx) > 0:
                ll += np.log(probs[chosen_idx[0]] + 1e-10)
        
        return -ll  # Return negative for minimization
    
    def _gradient(self, params, X_sets, y_sets):
        """
        Calculate gradient of the log-likelihood
        """
        n_features = len(params) - 1 if self.fit_intercept else len(params)
        grad = np.zeros(len(params))
        
        for X_set, y_set in zip(X_sets, y_sets):
            if self.fit_intercept:
                utilities = X_set @ params[1:] + params[0]
            else:
                utilities = X_set @ params
            
            probs = softmax(utilities)
            
            # Gradient calculation
            diff = y_set - probs
            
            if self.fit_intercept:
                grad[0] += np.sum(diff)
                grad[1:] += X_set.T @ diff
            else:
                grad += X_set.T @ diff
        
        return -grad  # Return negative for minimization
    
    def fit(self, X, y, choice_df=None):
        """
        Fit the Multinomial Logit model
        """
        # If choice_df is provided, use it to identify choice sets
        if choice_df is not None:
            choice_sets = self._create_choice_sets(choice_df)
            
            X_sets = []
            y_sets = []
            
            for name, group in choice_sets:
                if len(group) > 1:  # Need at least 2 alternatives
                    indices = group.index
                    X_sets.append(X.loc[indices].values if hasattr(X, 'loc') else X[indices])
                    y_sets.append(y.loc[indices].values if hasattr(y, 'loc') else y[indices])
        else:
            # Simple approach: treat each observation as a separate choice
            X_sets = [X[i:i+1] for i in range(len(X))]
            y_sets = [y[i:i+1] for i in range(len(y))]
        
        # Initialize parameters
        n_features = X.shape[1]
        if self.fit_intercept:
            initial_params = np.zeros(n_features + 1)
        else:
            initial_params = np.zeros(n_features)
        
        # Optimize using L-BFGS-B
        result = minimize(
            fun=self._log_likelihood,
            x0=initial_params,
            args=(X_sets, y_sets),
            method='L-BFGS-B',
            jac=self._gradient,
            options={'maxiter': 1000}
        )
        
        self.converged_ = result.success
        
        if self.fit_intercept:
            self.intercept_ = np.array([result.x[0]])
            self.coef_ = np.array([result.x[1:]])
        else:
            self.intercept_ = np.array([0.0])
            self.coef_ = np.array([result.x])
        
        return self
    
    def predict_proba(self, X):
        """
        Predict probabilities for each alternative
        """
        if self.fit_intercept:
            utilities = X @ self.coef_[0] + self.intercept_[0]
        else:
            utilities = X @ self.coef_[0]
        
        # For binary case, convert to probabilities
        probs = 1 / (1 + np.exp(-utilities))
        return np.column_stack([1 - probs, probs])

def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        attributes = payload.get('attributes')
        scenarios = payload.get('scenarios')

        if not data or not attributes:
            raise ValueError("Missing 'data' or 'attributes'")
        
        df = pd.DataFrame(data)

        # Drop rows where 'chosen' is not 0 or 1, or is missing
        df = df[df['chosen'].isin([0, 1])]
        
        if df.empty:
            raise ValueError("No valid choice data found.")

        y = pd.to_numeric(df['chosen'], errors='coerce')

        X_list = []
        feature_names = []
        original_levels_map = {}
        
        independent_vars = list(attributes.keys())
        
        # Create dummy variables for categorical attributes
        for attr_name, props in attributes.items():
            if props['type'] == 'categorical':
                df[attr_name] = df[attr_name].astype('category')
                levels = df[attr_name].cat.categories
                original_levels_map[attr_name] = levels.tolist()
                
                # Create dummy variables (drop_first=True for identification)
                dummies = pd.get_dummies(df[attr_name], prefix=attr_name, drop_first=True).astype(int)
                X_list.append(dummies)
                feature_names.extend(dummies.columns.tolist())
        
        if not X_list:
            raise ValueError("No valid features for analysis.")

        X = pd.concat(X_list, axis=1)

        # Align data after potential row drops from 'chosen'
        X, y = X.align(y, join='inner', axis=0)

        # --- Multinomial Logit Model ---
        model = MultinomialLogit(fit_intercept=True)
        
        # Pass the original dataframe to help identify choice sets
        model.fit(X, y, choice_df=df.loc[X.index])
        
        # --- Part-Worths Calculation ---
        part_worths = []
        coeff_map = dict(zip(X.columns, model.coef_[0]))
        
        # Add intercept to represent the base utility
        part_worths.append({'attribute': 'Base', 'level': 'Intercept', 'value': float(model.intercept_[0])})
        
        total_utility_range = {}

        for attr_name, levels in original_levels_map.items():
            # Base level has utility 0 (reference level)
            base_level_worth = 0
            part_worths.append({'attribute': attr_name, 'level': levels[0], 'value': base_level_worth})
            
            level_utilities = [base_level_worth]
            
            # Add utilities for other levels
            for level in levels[1:]:
                feature_name = f"{attr_name}_{level}"
                utility = coeff_map.get(feature_name, 0)
                part_worths.append({'attribute': attr_name, 'level': level, 'value': float(utility)})
                level_utilities.append(utility)

            # Calculate utility range for importance calculation
            total_utility_range[attr_name] = max(level_utilities) - min(level_utilities)
        
        # --- Importance Calculation ---
        total_range_sum = sum(total_utility_range.values())
        importance = []
        if total_range_sum > 0:
            for attr_name, range_val in total_utility_range.items():
                importance.append({
                    'attribute': attr_name,
                    'importance': float((range_val / total_range_sum) * 100)
                })
        importance.sort(key=lambda x: x['importance'], reverse=True)
        
        # --- Model Fit (McFadden's R-squared for MNL) ---
        # Calculate log-likelihood for the full model
        y_pred_proba = model.predict_proba(X)
        log_likelihood_full = -log_loss(y, y_pred_proba, normalize=False)
        
        # Calculate log-likelihood for null model (equal probabilities)
        n_choices = len(np.unique(y))
        null_proba = np.ones((len(y), 2)) / 2  # Equal probability for binary
        log_likelihood_null = -log_loss(y, null_proba, normalize=False)
        
        # McFadden's R-squared
        mcfadden_r2 = 1 - (log_likelihood_full / log_likelihood_null) if log_likelihood_null != 0 else 0
        
        # Prepare coefficients dictionary
        coefficients = {'intercept': float(model.intercept_[0])}
        for feature, coef in coeff_map.items():
            coefficients[feature] = float(coef)

        final_results = {
            'partWorths': part_worths,
            'importance': importance,
            'regression': {
                'modelType': 'Multinomial Logit (MNL)',
                'rSquared': float(mcfadden_r2),
                'coefficients': coefficients,
                'converged': model.converged_
            },
        }

        print(json.dumps({'results': final_results}, default=_to_native_type))

    except Exception as e:
        import traceback
        print(json.dumps({"error": str(e), "trace": traceback.format_exc()}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()

    