import sys
import json
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from scipy import stats
import statsmodels.api as sm
from statsmodels.formula.api import ols
from statsmodels.stats.anova import anova_lm
import warnings
import io
import base64
import math
import re

warnings.filterwarnings('ignore')

# Set seaborn style globally
sns.set_theme(style="darkgrid")
sns.set_context("notebook", font_scale=1.1)

def _to_native_type(obj):
    """Convert numpy types to native Python types, handling NaN/Inf values"""
    if isinstance(obj, (np.floating, float)):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return float(obj)
    elif isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.bool_):
        return bool(obj)
    elif isinstance(obj, np.ndarray):
        return [_to_native_type(item) for item in obj.tolist()]
    elif isinstance(obj, dict):
        return {key: _to_native_type(value) for key, value in obj.items()}
    elif isinstance(obj, (list, tuple)):
        return [_to_native_type(item) for item in obj]
    return obj

class AncovaAnalysis:
    def __init__(self, data, dependent_var, factor_var, covariate_vars, alpha=0.05):
        if isinstance(data, list):
            self.data = pd.DataFrame(data)
        elif isinstance(data, dict):
            if data and isinstance(next(iter(data.values())), list):
                self.data = pd.DataFrame(data)
            else:
                self.data = pd.DataFrame([data])
        else:
            self.data = pd.DataFrame(data)
        
        self.dependent_var = dependent_var
        self.factor_var = factor_var
        self.covariate_vars = covariate_vars if isinstance(covariate_vars, list) else [covariate_vars]
        self.alpha = alpha
        self.results = {}
        self._prepare_data()

    def _prepare_data(self):
        all_vars = [self.dependent_var, self.factor_var] + self.covariate_vars
        original_indices = self.data.index.tolist()
        working_data = self.data[all_vars].copy()
        
        for var in [self.dependent_var] + self.covariate_vars:
            working_data[var] = pd.to_numeric(working_data[var], errors='coerce')
        
        working_data[self.factor_var] = working_data[self.factor_var].astype('category')
        missing_mask = working_data.isnull().any(axis=1)
        dropped_indices = [original_indices[i] for i, is_missing in enumerate(missing_mask) if is_missing]
        self.clean_data = working_data.dropna().copy()
        
        self.results['n_dropped'] = len(dropped_indices)
        self.results['dropped_rows'] = dropped_indices
        
        self.dv_clean = re.sub(r'[^A-Za-z0-9_]', '_', self.dependent_var)
        self.fv_clean = re.sub(r'[^A-Za-z0-9_]', '_', self.factor_var)
        self.cv_clean = [re.sub(r'[^A-Za-z0-9_]', '_', c) for c in self.covariate_vars]
        
        rename_dict = {
            self.dependent_var: self.dv_clean,
            self.factor_var: self.fv_clean,
            **dict(zip(self.covariate_vars, self.cv_clean))
        }
        self.clean_data.rename(columns=rename_dict, inplace=True)
        
    def _generate_interpretation(self):
        if 'anova_table' not in self.results:
            return "Interpretation could not be generated as analysis results are missing."

        anova_dict = {row['Source']: row for row in self.results['anova_table']}
        
        def format_p(p_val):
            if p_val is None: return "p = n/a"
            return f"< .001" if p_val < 0.001 else f"= {p_val:.3f}"
        
        def get_effect_size_interp(eta_sq_p):
            if eta_sq_p is None: return "unknown"
            if eta_sq_p >= 0.14: return "large"
            if eta_sq_p >= 0.06: return "medium"
            if eta_sq_p >= 0.01: return "small"
            return "negligible"

        interpretation_parts = []
        
        # Section 1: Overall Analysis
        interpretation_parts.append("**Overall Analysis**")
        
        factor_key = f'Between Groups ({self.factor_var})'
        factor_res = anova_dict.get(factor_key)
        
        covariate_significant = False
        for cov in self.covariate_vars:
            cov_key = f'Covariate ({cov})'
            cov_res = anova_dict.get(cov_key)
            if cov_res and 'p-value' in cov_res and cov_res['p-value'] is not None:
                if cov_res['p-value'] < self.alpha:
                    covariate_significant = True
                    break
        
        if factor_res and 'p-value' in factor_res and factor_res['p-value'] is not None:
            is_sig = factor_res['p-value'] < self.alpha
            p_text = format_p(factor_res['p-value'])
            effect_size = factor_res.get('η²p', 0)
            effect_interp = get_effect_size_interp(effect_size)
            
            if is_sig:
                interpretation_parts.append(
                    f"The ANCOVA reveals a statistically significant effect of <strong>{self.factor_var}</strong> on <strong>{self.dependent_var}</strong> "
                    f"after controlling for <strong>{', '.join(self.covariate_vars)}</strong> "
                    f"(F({factor_res['df']:.0f}, {anova_dict.get('Within Groups (Error)', {}).get('df', 0):.0f}) = {factor_res['F']:.2f}, "
                    f"p {p_text}, η²p = {effect_size:.3f}). This represents a {effect_interp} effect size, indicating that groups differ "
                    f"meaningfully even after accounting for covariate influences."
                )
                
                if covariate_significant:
                    interpretation_parts.append(
                        f"The covariate(s) successfully controlled for variance in the outcome, and the group effect remains significant "
                        f"after this adjustment. This suggests the factor has a genuine effect beyond what can be explained by the covariate(s)."
                    )
                else:
                    interpretation_parts.append(
                        f"Although the covariate(s) did not significantly predict the outcome, the main effect of {self.factor_var} is robust and significant."
                    )
            else:
                interpretation_parts.append(
                    f"The ANCOVA does not detect a statistically significant effect of <strong>{self.factor_var}</strong> on <strong>{self.dependent_var}</strong> "
                    f"after controlling for <strong>{', '.join(self.covariate_vars)}</strong> "
                    f"(F({factor_res['df']:.0f}, {anova_dict.get('Within Groups (Error)', {}).get('df', 0):.0f}) = {factor_res['F']:.2f}, "
                    f"p {p_text}). Groups do not differ significantly on the outcome after covariate adjustment."
                )
                
                if covariate_significant:
                    interpretation_parts.append(
                        f"While <strong>{', '.join(self.covariate_vars)}</strong> significantly predicted <strong>{self.dependent_var}</strong>, "
                        f"the groups themselves do not differ after controlling for this covariate. Any apparent group differences may be "
                        f"attributable to differences in the covariate rather than the grouping factor."
                    )
        
        interpretation_parts.append("")
        
        # Section 2: Statistical Insights
        interpretation_parts.append("**Statistical Insights**")
        
        # Covariate effects
        for i, cov in enumerate(self.covariate_vars):
            cov_key = f'Covariate ({cov})'
            cov_res = anova_dict.get(cov_key)
            
            if cov_res and 'p-value' in cov_res and cov_res['p-value'] is not None:
                is_sig = cov_res['p-value'] < self.alpha
                p_text = format_p(cov_res['p-value'])
                effect_size = cov_res.get('η²p', 0)
                effect_interp = get_effect_size_interp(effect_size)
                
                sig_text = "significantly predicted" if is_sig else "did not significantly predict"
                
                interpretation_parts.append(
                    f"→ <strong>{cov}</strong> (covariate): {sig_text} {self.dependent_var}, "
                    f"F({cov_res['df']:.0f}, {anova_dict.get('Within Groups (Error)', {}).get('df', 0):.0f}) = {cov_res['F']:.2f}, "
                    f"p {p_text}, η²p = {effect_size:.3f} ({effect_interp} effect)"
                )
                
                if 'covariate_info' in self.results and cov in self.results['covariate_info']:
                    coef = self.results['covariate_info'][cov]['coefficient']
                    if is_sig:
                        direction = "increases" if coef > 0 else "decreases"
                        interpretation_parts.append(
                            f"  • For every 1-unit increase in {cov}, {self.dependent_var} {direction} by {abs(coef):.3f} units"
                        )
        
        # Main effect details
        if factor_res and 'p-value' in factor_res:
            interpretation_parts.append("")
            interpretation_parts.append(
                f"→ <strong>{self.factor_var}</strong> (main effect): "
                f"F({factor_res['df']:.0f}, {anova_dict.get('Within Groups (Error)', {}).get('df', 0):.0f}) = {factor_res['F']:.2f}, "
                f"p {format_p(factor_res['p-value'])}, η²p = {factor_res.get('η²p', 0):.3f}"
            )
        
        # Interaction check
        interaction_key = f'Interaction ({self.factor_var} × {self.covariate_vars[0]})'
        int_res = anova_dict.get(interaction_key)
        
        if int_res and 'p-value' in int_res and int_res['p-value'] is not None:
            is_sig = int_res['p-value'] < self.alpha
            p_text = format_p(int_res['p-value'])
            
            interpretation_parts.append("")
            if is_sig:
                interpretation_parts.append(
                    f"→ <strong>Interaction</strong> ({self.factor_var} × {self.covariate_vars[0]}): "
                    f"F({int_res['df']:.0f}, {anova_dict.get('Within Groups (Error)', {}).get('df', 0):.0f}) = {int_res['F']:.2f}, "
                    f"p {p_text} (significant)"
                )
                interpretation_parts.append(
                    f"  • ⚠️ The relationship between {self.covariate_vars[0]} and {self.dependent_var} differs across groups, "
                    f"violating the homogeneity of slopes assumption"
                )
            else:
                interpretation_parts.append(
                    f"→ <strong>Interaction</strong> ({self.factor_var} × {self.covariate_vars[0]}): "
                    f"p {p_text} (not significant)"
                )
                interpretation_parts.append(
                    f"  • ✓ Homogeneity of slopes assumption is met - the covariate-outcome relationship is consistent across groups"
                )
        
        # Model fit
        if 'r_squared' in self.results:
            interpretation_parts.append("")
            interpretation_parts.append(
                f"The overall model explains {self.results['r_squared']*100:.1f}% of the variance in {self.dependent_var} "
                f"(R² = {self.results['r_squared']:.3f}, Adjusted R² = {self.results.get('adj_r_squared', 0):.3f})."
            )
        
        interpretation_parts.append("")
        
        # Section 3: Recommendations
        interpretation_parts.append("**Recommendations**")
        
        if factor_res and factor_res.get('p-value', 1) < self.alpha:
            # Significant main effect
            interpretation_parts.append(
                f"• Examine adjusted means to identify which groups differ and by how much"
            )
            interpretation_parts.append(
                f"• Consider post-hoc pairwise comparisons (with appropriate corrections) if there are more than 2 groups"
            )
            interpretation_parts.append(
                f"• Verify ANCOVA assumptions: linearity of covariate-outcome relationship, homogeneity of regression slopes, and independence of covariate from treatment"
            )
            interpretation_parts.append(
                f"• Report both unadjusted and adjusted means to show the impact of covariate control"
            )
            
            if int_res and int_res.get('p-value', 1) < self.alpha:
                interpretation_parts.append(
                    f"• ⚠️ Due to significant interaction, consider simple slopes analysis or separate analyses for each group rather than interpreting the main effect"
                )
            
            interpretation_parts.append(
                f"• Consider effect size (η²p = {factor_res.get('η²p', 0):.3f}) when evaluating practical significance"
            )
        else:
            # Non-significant main effect
            interpretation_parts.append(
                f"• Verify that the covariate is truly relevant to the outcome (theoretical justification)"
            )
            interpretation_parts.append(
                f"• Check if sample size is adequate for detecting effects of the expected magnitude"
            )
            interpretation_parts.append(
                f"• Consider whether the factor variable appropriately captures the grouping you're interested in"
            )
            interpretation_parts.append(
                f"• Examine assumption checks - violations can reduce power to detect effects"
            )
            
            if covariate_significant:
                interpretation_parts.append(
                    f"• The significant covariate effect suggests individual differences matter - consider focusing on the covariate relationship"
                )
            else:
                interpretation_parts.append(
                    f"• Neither the factor nor covariate significantly predict the outcome - reconsider the theoretical model or measurement quality"
                )
        
        self.results['interpretation'] = "\n".join(interpretation_parts)


    def run_analysis(self):
        covariates_formula = ' + '.join(self.cv_clean)
        formula = f'{self.dv_clean} ~ C({self.fv_clean}) * ({covariates_formula})'
        
        try:
            model = ols(formula, data=self.clean_data).fit()
            anova_table = anova_lm(model, typ=2)
        except Exception as e:
            formula = f'{self.dv_clean} ~ C({self.fv_clean}) + {covariates_formula}'
            try:
                model = ols(formula, data=self.clean_data).fit()
                anova_table = anova_lm(model, typ=2)
                warnings.warn(f"Could not fit interaction model, proceeding without it. Error: {e}")
            except Exception as e2:
                raise ValueError(f"Unable to fit ANCOVA model. Error: {e2}")

        self.model = model
        
        if 'Residual' in anova_table.index and 'sum_sq' in anova_table.columns:
             ss_residual = anova_table.loc['Residual', 'sum_sq']
             anova_table['η²p'] = anova_table['sum_sq'] / (anova_table['sum_sq'] + ss_residual)
        else:
             anova_table['η²p'] = np.nan
        
        summary_obj = model.summary()
        summary_data = []
        for table in summary_obj.tables:
            table_data = [list(row) for row in table.data]
            if table_data and len(table_data) > 1 and 'coef' in table_data[0]:
                for row in table_data[1:]:
                    if row and row[0]:
                         row[0] = re.sub(r'C\(([^)]+)\).*\[T\.([^\]]+)\]', r'\1[\2]', row[0].strip())
            
            summary_data.append({
                'caption': getattr(table, 'title', None),
                'data': table_data
            })
        self.results['model_summary_data'] = summary_data
        
        cleaned_index = {}
        cleaned_index[f'C({self.fv_clean})'] = f'Between Groups ({self.factor_var})'
        
        for i, cv in enumerate(self.cv_clean):
            cleaned_index[cv] = f'Covariate ({self.covariate_vars[i]})'
        
        for i, cv in enumerate(self.cv_clean):
            interaction_key = f'C({self.fv_clean}):{cv}'
            cleaned_index[interaction_key] = f'Interaction ({self.factor_var} × {self.covariate_vars[i]})'
        
        cleaned_index['Residual'] = 'Within Groups (Error)'
        
        anova_table_renamed = anova_table.rename(index=cleaned_index)
        self.results['anova_table'] = anova_table_renamed.reset_index().rename(columns={'index': 'Source', 'PR(>F)': 'p-value'}).to_dict('records')
        self.results['residuals'] = model.resid.tolist()
        
        self._calculate_adjusted_means()
        self._extract_covariate_info()
        self._test_assumptions(model)
        self._generate_interpretation()
    
    def _calculate_adjusted_means(self):
        try:
            adjusted_means = {}
            covariate_means = {cv: self.clean_data[cv].mean() for cv in self.cv_clean}
            
            for group_name in self.clean_data[self.fv_clean].unique():
                pred_data = pd.DataFrame({
                    self.fv_clean: [group_name],
                    **{cv: [covariate_means[cv]] for cv in self.cv_clean}
                })
                
                pred_value = self.model.predict(pred_data)[0]
                n_in_group = len(self.clean_data[self.clean_data[self.fv_clean] == group_name])
                mse = np.sum(self.model.resid**2) / self.model.df_resid
                se = np.sqrt(mse / n_in_group)
                
                adjusted_means[str(group_name)] = {
                    'adjusted_mean': pred_value,
                    'se': se,
                    'n': int(n_in_group)
                }
            
            self.results['adjusted_means'] = adjusted_means
            self.results['covariate_means'] = {self.covariate_vars[i]: float(covariate_means[cv]) 
                                               for i, cv in enumerate(self.cv_clean)}
        except Exception as e:
            warnings.warn(f"Could not calculate adjusted means: {e}")
            self.results['adjusted_means'] = {}
    
    def _extract_covariate_info(self):
        try:
            covariate_info = {}
            
            for i, cv in enumerate(self.cv_clean):
                if cv in self.model.params.index:
                    covariate_info[self.covariate_vars[i]] = {
                        'coefficient': float(self.model.params[cv]),
                        'std_err': float(self.model.bse[cv]),
                        't_value': float(self.model.tvalues[cv]),
                        'p_value': float(self.model.pvalues[cv])
                    }
            
            self.results['covariate_info'] = covariate_info
            self.results['r_squared'] = float(self.model.rsquared)
            self.results['adj_r_squared'] = float(self.model.rsquared_adj)
            
        except Exception as e:
            warnings.warn(f"Could not extract covariate info: {e}")
            self.results['covariate_info'] = {}

    def _test_assumptions(self, model):
        residuals = model.resid
        
        if len(residuals) >= 3:
            shapiro_stat, shapiro_p = stats.shapiro(residuals)
        else:
            shapiro_stat, shapiro_p = (np.nan, np.nan)
        
        groups = [group[self.dv_clean] for name, group in self.clean_data.groupby(self.fv_clean)]
        if len(groups) > 1 and all(len(g) > 0 for g in groups):
            levene_stat, levene_p = stats.levene(*groups)
        else:
            levene_stat, levene_p = (np.nan, np.nan)
        
        self.results['assumptions'] = {
            'normality': {
                'statistic': shapiro_stat, 
                'p_value': shapiro_p, 
                'met': shapiro_p > self.alpha if not math.isnan(shapiro_p) else None
            },
            'homogeneity': {
                'statistic': levene_stat, 
                'p_value': levene_p, 
                'met': levene_p > self.alpha if not math.isnan(levene_p) else None
            }
        }

    def plot_results(self):
        fig, axes = plt.subplots(1, 2, figsize=(14, 6))

        if self.cv_clean:
            original_cov_name = self.covariate_vars[0]
            clean_cov_name = self.cv_clean[0]
            
            # Use crest palette to match other scripts
            palette = sns.color_palette("crest", n_colors=len(self.clean_data[self.fv_clean].unique()))
            
            sns.scatterplot(
                data=self.clean_data, 
                x=clean_cov_name, 
                y=self.dv_clean, 
                hue=self.fv_clean, 
                palette=palette,
                s=80,
                alpha=0.6,
                ax=axes[0]
            )
            
            for i, (group_name, group_data) in enumerate(self.clean_data.groupby(self.fv_clean)):
                if len(group_data) > 1:
                    try:
                        group_model = ols(f'{self.dv_clean} ~ {clean_cov_name}', data=group_data).fit()
                        x_vals = np.linspace(group_data[clean_cov_name].min(), group_data[clean_cov_name].max(), 100)
                        y_vals = group_model.predict(pd.DataFrame({clean_cov_name: x_vals}))
                        axes[0].plot(x_vals, y_vals, color=palette[i], linewidth=2)
                    except:
                        pass

            axes[0].set_title('Interaction Plot', fontsize=12, fontweight='bold')
            axes[0].set_xlabel(original_cov_name, fontsize=12)
            axes[0].set_ylabel(self.dependent_var, fontsize=12)
            axes[0].legend(title=self.factor_var, fontsize=10)
        else:
             axes[0].text(0.5, 0.5, 'No covariates to plot.', ha='center', va='center', fontsize=12)
             axes[0].axis('off')

        if 'residuals' in self.results and len(self.results['residuals']) > 0:
            sm.qqplot(np.array(self.results['residuals']), line='s', ax=axes[1])
            axes[1].set_title('Q-Q Plot of Residuals', fontsize=12, fontweight='bold')
            axes[1].set_xlabel('Theoretical Quantiles', fontsize=12)
            axes[1].set_ylabel('Sample Quantiles', fontsize=12)
        else:
            axes[1].text(0.5, 0.5, 'No residuals available.', ha='center', va='center', fontsize=12)
            axes[1].axis('off')
        
        plt.tight_layout()
        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=100, bbox_inches='tight')
        plt.close(fig)
        buf.seek(0)
        return f"data:image/png;base64,{base64.b64encode(buf.read()).decode('utf-8')}"

def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        dependent_var = payload.get('dependentVar')
        factor_var = payload.get('factorVar')
        covariate_vars = payload.get('covariateVars')

        if not all([data, dependent_var, factor_var, covariate_vars]):
            raise ValueError("Missing data, dependentVar, factorVar, or covariateVars")

        ancova = AncovaAnalysis(data, dependent_var, factor_var, covariate_vars)
        ancova.run_analysis()
        plot_image = ancova.plot_results()

        response = {
            'results': ancova.results,
            'plot': plot_image
        }
        
        cleaned_response = _to_native_type(response)
        print(json.dumps(cleaned_response))

    except Exception as e:
        import traceback
        error_details = {
            "error": str(e),
            "traceback": traceback.format_exc()
        }
        print(json.dumps(error_details), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()

    