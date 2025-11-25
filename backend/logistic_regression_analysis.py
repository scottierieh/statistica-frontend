import sys
import json
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import accuracy_score, confusion_matrix, classification_report, roc_curve, auc
import matplotlib.pyplot as plt
import seaborn as sns
import io
import base64
import warnings
import statsmodels.api as sm
from statsmodels.stats.outliers_influence import variance_inflation_factor

warnings.filterwarnings('ignore')

# Set seaborn style globally
sns.set_theme(style="darkgrid")
sns.set_context("notebook", font_scale=1.1)

def _to_native_type(obj):
    if isinstance(obj, np.integer): return int(obj)
    elif isinstance(obj, np.floating):
        if np.isnan(obj):
            return None
        return float(obj)
    elif isinstance(obj, np.ndarray): return obj.tolist()
    elif isinstance(obj, np.bool_): return bool(obj)
    return obj

class LogisticRegressionAnalysis:
    def __init__(self, data, dependent_var, independent_vars, test_size=0.3, random_state=42):
        self.data = data.copy()
        self.dependent_var = dependent_var
        self.independent_vars = independent_vars
        self.test_size = test_size
        self.random_state = random_state
        self.results = {}
        self.n_dropped = 0
        self.dropped_rows = []
        self._prepare_data()

    def _prepare_data(self):
        all_vars = [self.dependent_var] + self.independent_vars
        
        # Track dropped rows
        original_indices = self.data.index.tolist()
        self.clean_data = self.data[all_vars].dropna()
        clean_indices = self.clean_data.index.tolist()
        self.dropped_rows = [idx for idx in original_indices if idx not in clean_indices]
        self.n_dropped = len(self.dropped_rows)
        
        if self.clean_data.empty:
            raise ValueError("No valid data remaining after removing rows with missing values.")

        self.le = LabelEncoder()
        y_encoded = self.le.fit_transform(self.clean_data[self.dependent_var])
        self.dependent_classes = self.le.classes_.tolist()
        if len(self.dependent_classes) != 2:
            raise ValueError(f"Dependent variable must have exactly 2 unique categories, but found {len(self.dependent_classes)}.")
        
        self.clean_data[self.dependent_var + '_encoded'] = y_encoded
        
        X_raw = self.clean_data[self.independent_vars]
        self.X = pd.get_dummies(X_raw, drop_first=True, dtype=float)
        self.feature_names = self.X.columns.tolist()
        
        self.y = self.clean_data[self.dependent_var + '_encoded']
        
        if len(self.X) != len(self.y):
             raise ValueError("X and y have inconsistent numbers of samples after processing.")

        try:
             self.X_train, self.X_test, self.y_train, self.y_test = train_test_split(self.X, self.y, test_size=self.test_size, random_state=self.random_state, stratify=self.y)
        except ValueError:
             # Fallback if stratification fails (e.g., very small class sizes)
             self.X_train, self.X_test, self.y_train, self.y_test = train_test_split(self.X, self.y, test_size=self.test_size, random_state=self.random_state)

        self.scaler = StandardScaler()
        self.X_train_scaled = self.scaler.fit_transform(self.X_train)
        self.X_test_scaled = self.scaler.transform(self.X_test)
        
        self._check_multicollinearity()

    def _check_multicollinearity(self):
        if self.X_train.shape[1] < 2:
            return 
        
        X_train_df_scaled = pd.DataFrame(self.X_train_scaled, columns=self.feature_names)
        
        X_with_const = sm.add_constant(X_train_df_scaled, has_constant='add')
        
        vif_data = pd.DataFrame()
        vif_data["feature"] = X_with_const.columns
        try:
            vif_data["VIF"] = [variance_inflation_factor(X_with_const.values, i) for i in range(X_with_const.shape[1])]
        except Exception as e:
            if "Singular matrix" in str(e):
                 corr_matrix = X_with_const.corr()
                 upper_tri = corr_matrix.where(np.triu(np.ones(corr_matrix.shape), k=1).astype(bool))
                 to_drop = [column for column in upper_tri.columns if any(upper_tri[column].abs() > 0.999)]
                 raise ValueError(f"Perfect multicollinearity detected. Please remove one of these highly correlated variables: {', '.join(to_drop)}")
            raise ValueError(f"Multicollinearity check failed. Original error: {e}")

        high_vif = vif_data[vif_data['VIF'] > 10]
        if not high_vif.empty:
            offending_vars = ", ".join(high_vif[high_vif['feature'] != 'const']['feature'].tolist())
            raise ValueError(f"High multicollinearity detected (VIF > 10) for variables: {offending_vars}. Please remove one or more of these variables to proceed.")

    def run_analysis(self):
        # Create DataFrames with matching indices for statsmodels
        X_train_df_scaled = pd.DataFrame(self.X_train_scaled, index=self.y_train.index, columns=self.feature_names)
        X_test_df_scaled = pd.DataFrame(self.X_test_scaled, index=self.y_test.index, columns=self.feature_names)

        X_train_const = sm.add_constant(X_train_df_scaled)
        X_test_const = sm.add_constant(X_test_df_scaled)
        
        logit_model = sm.Logit(self.y_train, X_train_const)
        self.model_fit = logit_model.fit(disp=0)

        y_prob = self.model_fit.predict(X_test_const)
        y_pred = (y_prob > 0.5).astype(int)
        
        self._calculate_metrics(self.y_test.values, y_pred, y_prob)
        self._generate_interpretation()

    def _calculate_metrics(self, y_true, y_pred, y_prob):
        accuracy = accuracy_score(y_true, y_pred)
        cm = confusion_matrix(y_true, y_pred)
        class_report = classification_report(y_true, y_pred, target_names=self.dependent_classes, output_dict=True, zero_division=0)
        
        params = self.model_fit.params
        conf = self.model_fit.conf_int()
        conf.columns = ['2.5%', '97.5%']
        
        odds_ratios = np.exp(params)
        odds_ratios_ci = np.exp(conf)
        
        self.results['metrics'] = { 'accuracy': accuracy, 'confusion_matrix': cm.tolist(), 'classification_report': class_report }
        self.results['coefficients'] = dict(zip(['const'] + self.feature_names, params))
        self.results['odds_ratios'] = dict(zip(odds_ratios.index, odds_ratios.values))
        self.results['odds_ratios_ci'] = odds_ratios_ci.to_dict('index')
        self.results['p_values'] = dict(zip(self.model_fit.pvalues.index, self.model_fit.pvalues.values))
        
        fpr, tpr, _ = roc_curve(y_true, y_prob)
        roc_auc = auc(fpr, tpr)
        
        self.results['roc_data'] = {'fpr': fpr.tolist(), 'tpr': tpr.tolist(), 'auc': roc_auc}
        self.results['dependent_classes'] = self.dependent_classes
        
        self.results['model_summary'] = {
            'llf': self.model_fit.llf, 'llnull': self.model_fit.llnull, 'llr': self.model_fit.llr,
            'llr_pvalue': self.model_fit.llr_pvalue, 'prsquared': self.model_fit.prsquared,
            'df_model': self.model_fit.df_model, 'df_resid': self.model_fit.df_resid
        }
        
        # Add dropped rows info
        self.results['n_dropped'] = self.n_dropped
        self.results['dropped_rows'] = self.dropped_rows
    
    def _generate_interpretation(self):
        res = self.results
        summary = res['model_summary']
        
        chi2 = summary['llr']
        df = summary['df_model']
        p_val = summary['llr_pvalue']
        pseudo_r2 = summary['prsquared']
        accuracy = res['metrics']['accuracy']
        auc_score = res['roc_data']['auc']
        cm = np.array(res['metrics']['confusion_matrix'])

        interpretation_sections = []
        
        # Section 1: Overall Analysis
        model_sig = p_val < 0.05
        p_val_text = "p < .001" if p_val < 0.001 else f"p = {p_val:.3f}"
        
        section1 = "**Overall Analysis**\n"
        section1 += f"A binary logistic regression was conducted to predict {self.dependent_var} based on {len(self.feature_names)} predictor variable(s). "
        section1 += f"The model was fit on {len(self.clean_data)} complete observations.\n\n"
        
        if model_sig:
            section1 += f"• Model Significance: The overall model was statistically significant, chi-squared({df:.0f}) = {chi2:.2f}, {p_val_text}, "
            section1 += f"indicating that the predictors collectively explain a significant portion of the variance in the outcome.\n"
        else:
            section1 += f"• Model Significance: The overall model was not statistically significant, chi-squared({df:.0f}) = {chi2:.2f}, {p_val_text}. "
            section1 += f"The predictors do not collectively provide significant explanatory power.\n"
        
        section1 += f"• Explained Variance: The model explained {pseudo_r2*100:.1f}% of the variance (McFadden's Pseudo R-squared) in {self.dependent_var}.\n"
        section1 += f"• Classification Performance: The model correctly classified {accuracy*100:.1f}% of all cases"
        
        if auc_score >= 0.9:
            section1 += f" with excellent discrimination (AUC = {auc_score:.3f})."
        elif auc_score >= 0.8:
            section1 += f" with good discrimination (AUC = {auc_score:.3f})."
        elif auc_score >= 0.7:
            section1 += f" with fair discrimination (AUC = {auc_score:.3f})."
        else:
            section1 += f" with poor discrimination (AUC = {auc_score:.3f})."
        
        interpretation_sections.append(section1)
        
        # Section 2: Statistical Insights
        odds_ratios = res['odds_ratios']
        odds_ratios_ci = res['odds_ratios_ci']
        p_values = res['p_values']
        
        sig_preds_info = []
        nonsig_preds = []

        for var in self.feature_names:
            p = p_values.get(var)
            odds = odds_ratios.get(var)
            ci = odds_ratios_ci.get(var)
            
            if p is not None and odds is not None and ci is not None:
                if p < 0.05:
                    sig_preds_info.append({
                        'var': var.replace('_', ' '),
                        'odds': odds,
                        'ci_low': ci['2.5%'],
                        'ci_high': ci['97.5%'],
                        'p': p
                    })
                else:
                    nonsig_preds.append(var.replace('_', ' '))

        section2 = "**Statistical Insights**\n"
        
        if sig_preds_info:
            section2 += "The following variables showed statistically significant associations with the outcome:\n\n"
            for info in sig_preds_info:
                p_text = "p < .001" if info['p'] < 0.001 else f"p = {info['p']:.3f}"
                
                if info['odds'] > 1:
                    # Positive association
                    percent_change = (info['odds'] - 1) * 100
                    section2 += f"• {info['var']}: Each unit increase is associated with a {percent_change:.1f}% increase in the odds of the outcome "
                    section2 += f"(OR = {info['odds']:.3f}, 95% CI [{info['ci_low']:.3f}, {info['ci_high']:.3f}], {p_text}). "
                    section2 += f"This represents a positive effect on the likelihood of {self.dependent_var}.\n"
                else:
                    # Negative association
                    percent_change = (1 - info['odds']) * 100
                    section2 += f"• {info['var']}: Each unit increase is associated with a {percent_change:.1f}% decrease in the odds of the outcome "
                    section2 += f"(OR = {info['odds']:.3f}, 95% CI [{info['ci_low']:.3f}, {info['ci_high']:.3f}], {p_text}). "
                    section2 += f"This represents a protective effect against {self.dependent_var}.\n"
        else:
            section2 += "No predictor variables achieved statistical significance at the α = 0.05 level. "
            section2 += "This suggests that none of the included predictors have a significant independent association with the outcome.\n"
        
        if nonsig_preds:
            section2 += f"\nNon-significant predictors: {', '.join(nonsig_preds)}. "
            section2 += "These variables did not show significant associations when controlling for other predictors in the model."
        
        interpretation_sections.append(section2.strip())
        
        # Section 3: Recommendations
        section3 = "**Recommendations**\n"
        
        # Classification metrics
        if len(cm) == 2:
            tn, fp, fn, tp = cm.ravel()
            sensitivity = tp / (tp + fn) if (tp + fn) > 0 else 0
            specificity = tn / (tn + fp) if (tn + fp) > 0 else 0
            ppv = tp / (tp + fp) if (tp + fp) > 0 else 0
            npv = tn / (tn + fn) if (tn + fn) > 0 else 0
            
            section3 += f"• Sensitivity (Recall): {sensitivity*100:.1f}% - The model correctly identifies {sensitivity*100:.1f}% of actual positive cases.\n"
            section3 += f"• Specificity: {specificity*100:.1f}% - The model correctly identifies {specificity*100:.1f}% of actual negative cases.\n"
            section3 += f"• Positive Predictive Value: {ppv*100:.1f}% - When the model predicts positive, it is correct {ppv*100:.1f}% of the time.\n"
            section3 += f"• Negative Predictive Value: {npv*100:.1f}% - When the model predicts negative, it is correct {npv*100:.1f}% of the time.\n\n"
        
        # Recommendations
        section3 += "Interpretation Guidelines:\n"
        section3 += "• Odds ratios represent multiplicative effects on the odds of the outcome occurring.\n"
        section3 += "• A 95% confidence interval that does not include 1.0 indicates statistical significance.\n"
        section3 += "• Consider the practical significance of odds ratios in addition to statistical significance.\n"
        
        if auc_score < 0.7:
            section3 += "• The low AUC suggests limited discriminative ability. Consider adding more predictors or using alternative modeling approaches.\n"
        
        if pseudo_r2 < 0.2:
            section3 += "• The low Pseudo R-squared indicates substantial unexplained variance. Additional predictors may improve model fit.\n"
        
        if not model_sig:
            section3 += "• Given the non-significant overall model, interpret individual predictor effects with caution.\n"
        
        section3 += "• Validate findings with independent samples when possible to assess generalizability."
        
        interpretation_sections.append(section3)

        self.results['interpretation'] = "\n\n".join(interpretation_sections)

    def plot_results(self):
        fig, axes = plt.subplots(1, 2, figsize=(12, 5))
        
        # Define consistent line color
        line_color = '#4C72B0'
        
        # Plot 1: ROC Curve
        roc = self.results['roc_data']
        axes[0].plot(roc['fpr'], roc['tpr'], color=line_color, lw=2, label=f'ROC curve (area = {roc["auc"]:.2f})')
        axes[0].plot([0, 1], [0, 1], color='gray', lw=2, linestyle='--', alpha=0.7)
        axes[0].set_xlim([0.0, 1.0])
        axes[0].set_ylim([0.0, 1.05])
        axes[0].set_xlabel('False Positive Rate', fontsize=12)
        axes[0].set_ylabel('True Positive Rate', fontsize=12)
        axes[0].set_title('ROC Curve', fontsize=12, fontweight='bold')
        axes[0].legend(loc="lower right")

        # Plot 2: Confusion Matrix
        cm = np.array(self.results['metrics']['confusion_matrix'])
        sns.heatmap(cm, annot=True, fmt='d', cmap='vlag', ax=axes[1], 
                    xticklabels=self.dependent_classes, yticklabels=self.dependent_classes,
                    cbar_kws={'label': 'Count'})
        axes[1].set_xlabel('Predicted Label', fontsize=12)
        axes[1].set_ylabel('True Label', fontsize=12)
        axes[1].set_title('Confusion Matrix', fontsize=12, fontweight='bold')
        
        plt.tight_layout()
        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=100, bbox_inches='tight')
        plt.close(fig)
        buf.seek(0)
        return f"data:image/png;base64,{base64.b64encode(buf.read()).decode('utf-8')}"

def main():
    try:
        payload = json.load(sys.stdin)
        data = pd.DataFrame(payload.get('data'))
        dependent_var = payload.get('dependentVar')
        independent_vars = payload.get('independentVars')

        if not all([not data.empty, dependent_var, independent_vars]):
            raise ValueError("Missing data, dependentVar, or independentVars")

        analysis = LogisticRegressionAnalysis(data, dependent_var, independent_vars)
        analysis.run_analysis()
        
        plot_image = analysis.plot_results()

        response = {
            'results': analysis.results,
            'plot': plot_image
        }
        
        print(json.dumps(response, default=_to_native_type, indent=2))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()

    