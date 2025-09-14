
import sys
import json
import numpy as np
import pandas as pd
from sklearn.discriminant_analysis import LinearDiscriminantAnalysis, QuadraticDiscriminantAnalysis
from sklearn.model_selection import cross_val_predict, StratifiedKFold
from sklearn.metrics import confusion_matrix, accuracy_score
from sklearn.preprocessing import StandardScaler, LabelEncoder

def _to_native_type(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, np.bool_):
        return bool(obj)
    return obj

def _calculate_metrics(y_true, y_pred, groups):
    accuracy = accuracy_score(y_true, y_pred)
    cm = confusion_matrix(y_true, y_pred)
    
    per_group_accuracy = {}
    for i, group in enumerate(groups):
        group_mask = (y_true == i)
        if np.any(group_mask):
            per_group_accuracy[str(group)] = accuracy_score(y_true[group_mask], y_pred[group_mask])
        else:
            per_group_accuracy[str(group)] = 0.0

    return {
        'accuracy': _to_native_type(accuracy),
        'confusion_matrix': _to_native_type(cm),
        'per_group_accuracy': {k: _to_native_type(v) for k, v in per_group_accuracy.items()}
    }

def main():
    try:
        payload = json.load(sys.stdin)
        
        data = payload.get('data')
        group_var = payload.get('groupVar')
        predictor_vars = payload.get('predictorVars')

        if not all([data, group_var, predictor_vars]):
            raise ValueError("Missing 'data', 'groupVar', or 'predictorVars'")

        df = pd.DataFrame(data)
        
        # --- Data Cleaning ---
        all_vars = [group_var] + predictor_vars
        df_clean = df[all_vars].dropna().copy()
        
        le = LabelEncoder()
        df_clean[group_var + '_encoded'] = le.fit_transform(df_clean[group_var])
        
        X = df_clean[predictor_vars].values
        y_encoded = df_clean[group_var + '_encoded'].values
        
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)

        groups = le.classes_.tolist()
        results = {}

        # --- LDA ---
        try:
            lda = LinearDiscriminantAnalysis(store_covariance=True)
            lda.fit(X_scaled, y_encoded)
            y_pred_lda = lda.predict(X_scaled)
            
            lda_metrics = _calculate_metrics(y_encoded, y_pred_lda, groups)
            
            group_means_lda = []
            for i, group in enumerate(le.classes_):
                group_indices = df_clean[group_var] == group
                if np.any(group_indices):
                    group_mean = X_scaled[group_indices].mean(axis=0)
                    group_means_lda.append(group_mean)
                else:
                    # Append zeros if a group has no members after cleaning, though this is unlikely.
                    group_means_lda.append(np.zeros(len(predictor_vars)))
            

            results['lda'] = {
                'metrics': lda_metrics,
                'coefficients': _to_native_type(lda.coef_),
                'intercepts': _to_native_type(lda.intercept_),
                'group_means': _to_native_type(np.array(group_means_lda)),
                'priors': _to_native_type(lda.priors_),
                'explained_variance_ratio': _to_native_type(lda.explained_variance_ratio_) if hasattr(lda, 'explained_variance_ratio_') else None,
            }
        except Exception as e:
            results['lda'] = {'error': str(e)}

        # --- QDA ---
        try:
            qda = QuadraticDiscriminantAnalysis(store_covariance=True)
            qda.fit(X_scaled, y_encoded)
            y_pred_qda = qda.predict(X_scaled)

            qda_metrics = _calculate_metrics(y_encoded, y_pred_qda, groups)
            
            group_means_qda = []
            for i, group in enumerate(le.classes_):
                 group_indices = df_clean[group_var] == group
                 if np.any(group_indices):
                    group_mean = X_scaled[group_indices].mean(axis=0)
                    group_means_qda.append(group_mean)
                 else:
                    group_means_qda.append(np.zeros(len(predictor_vars)))
            

            results['qda'] = {
                'metrics': qda_metrics,
                'group_means': _to_native_type(np.array(group_means_qda)),
                'priors': _to_native_type(qda.priors_)
            }
        except Exception as e:
            results['qda'] = {'error': str(e)}
            
        final_result = {
            'groups': groups,
            'predictor_vars': predictor_vars,
            'lda': results.get('lda'),
            'qda': results.get('qda')
        }

        print(json.dumps(final_result, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
