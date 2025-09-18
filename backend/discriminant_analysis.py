
import sys
import json
import numpy as np
import pandas as pd
from sklearn.discriminant_analysis import LinearDiscriminantAnalysis, QuadraticDiscriminantAnalysis
from sklearn.model_selection import cross_val_predict, StratifiedKFold
from sklearn.metrics import confusion_matrix, accuracy_score
from sklearn.preprocessing import StandardScaler, LabelEncoder
import matplotlib.pyplot as plt
import seaborn as sns
import io
import base64

def _to_native_type(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, np.bool_):
        return bool(obj)
    return obj

def _calculate_metrics(y_true, y_pred, y_prob, groups):
    accuracy = accuracy_score(y_true, y_pred)
    cm = confusion_matrix(y_true, y_pred)
    
    per_group_accuracy = {}
    posterior_prob = {}
    
    for i, group in enumerate(groups):
        group_mask = (y_true == i)
        if np.any(group_mask):
            per_group_accuracy[str(group)] = accuracy_score(y_true[group_mask], y_pred[group_mask])
            
            # Calculate mean posterior probability for correctly classified instances
            correctly_classified_mask = group_mask & (y_pred == i)
            if np.any(correctly_classified_mask):
                posterior_prob[str(group)] = np.mean(y_prob[correctly_classified_mask, i])
            else:
                posterior_prob[str(group)] = 0.0
        else:
            per_group_accuracy[str(group)] = 0.0
            posterior_prob[str(group)] = 0.0


    return {
        'accuracy': _to_native_type(accuracy),
        'confusion_matrix': _to_native_type(cm),
        'per_group_accuracy': {k: _to_native_type(v) for k, v in per_group_accuracy.items()},
        'posterior_probabilities': {k: _to_native_type(v) for k,v in posterior_prob.items()}
    }

def plot_results(lda, X_scaled, y_encoded, le):
    fig, axes = plt.subplots(1, 3, figsize=(18, 5))
    fig.suptitle('Discriminant Analysis Visualizations', fontsize=16)

    # 1. Discriminant Space Plot
    if lda.explained_variance_ratio_.shape[0] >= 2:
        X_lda = lda.transform(X_scaled)
        plot_df = pd.DataFrame(X_lda[:, :2], columns=['LD1', 'LD2'])
        plot_df['Group'] = le.inverse_transform(y_encoded)
        
        sns.scatterplot(data=plot_df, x='LD1', y='LD2', hue='Group', ax=axes[0], alpha=0.7)
        axes[0].set_title('Discriminant Space')
        axes[0].set_xlabel(f'LD1 ({lda.explained_variance_ratio_[0]:.1%})')
        axes[0].set_ylabel(f'LD2 ({lda.explained_variance_ratio_[1]:.1%})')
        axes[0].grid(True, linestyle='--', alpha=0.6)

    else:
        axes[0].text(0.5, 0.5, 'Need at least 2 components\nto generate discriminant plot.', ha='center', va='center')


    # 2. Posterior Probabilities
    y_prob = lda.predict_proba(X_scaled)
    y_pred = lda.predict(X_scaled)
    post_probs = {}
    for i, group in enumerate(le.classes_):
        correctly_classified_mask = (y_encoded == i) & (y_pred == i)
        if np.any(correctly_classified_mask):
            post_probs[group] = np.mean(y_prob[correctly_classified_mask, i])
        else:
            post_probs[group] = 0
            
    sns.barplot(x=list(post_probs.keys()), y=list(post_probs.values()), ax=axes[1], palette='viridis')
    axes[1].set_title('Mean Posterior Probabilities (Correctly Classified)')
    axes[1].set_ylabel('Probability')
    axes[1].set_ylim(0, 1)

    # 3. Prior Probabilities
    sns.barplot(x=le.classes_, y=lda.priors_, ax=axes[2], palette='viridis')
    axes[2].set_title('Prior Probabilities of Groups')
    axes[2].set_ylabel('Proportion')

    plt.tight_layout(rect=[0, 0, 1, 0.96])
    buf = io.BytesIO()
    plt.savefig(buf, format='png')
    plt.close(fig)
    return base64.b64encode(buf.read()).decode('utf-8')


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
        plot_image = None

        # --- LDA ---
        try:
            lda = LinearDiscriminantAnalysis(store_covariance=True)
            lda.fit(X_scaled, y_encoded)
            y_pred_lda = lda.predict(X_scaled)
            y_prob_lda = lda.predict_proba(X_scaled)
            
            lda_metrics = _calculate_metrics(y_encoded, y_pred_lda, y_prob_lda, groups)
            
            group_means_lda = []
            for i, group in enumerate(le.classes_):
                group_indices = df_clean[group_var] == group
                if np.any(group_indices):
                    group_mean = X_scaled[group_indices].mean(axis=0)
                    group_means_lda.append(group_mean)
                else:
                    group_means_lda.append(np.zeros(len(predictor_vars)))
            
            plot_image = plot_results(lda, X_scaled, y_encoded, le)

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
            y_prob_qda = qda.predict_proba(X_scaled)

            qda_metrics = _calculate_metrics(y_encoded, y_pred_qda, y_prob_qda, groups)
            
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
            'qda': results.get('qda'),
            'plot': f"data:image/png;base64,{plot_image}" if plot_image else None
        }

        print(json.dumps(final_result, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
