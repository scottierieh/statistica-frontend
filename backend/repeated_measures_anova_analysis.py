import sys
import json
import numpy as np
import pandas as pd
import warnings
import matplotlib.pyplot as plt
import seaborn as sns
import io
import base64
import pingouin as pg
import math

warnings.filterwarnings('ignore')

def _to_native_type(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, (np.floating, float)):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, np.bool_):
        return bool(obj)
    return obj

class RepeatedMeasuresAnova:
    def __init__(self, data, subject_col, within_cols, dependent_var_template, between_col=None, alpha=0.05):
        self.data = pd.DataFrame(data).copy()
        self.subject_col = subject_col
        self.within_cols = within_cols
        self.dependent_var = dependent_var_template # This will be the name for the melted value column, e.g., 'score'
        self.between_col = between_col
        self.alpha = alpha
        self.results = {}
        self._prepare_data()

    def _prepare_data(self):
        # Track original indices before any operations
        original_length = len(self.data)
        self.data['__original_index__'] = range(original_length)
        
        id_vars = [self.subject_col, '__original_index__']
        if self.between_col and self.between_col in self.data.columns:
            id_vars.append(self.between_col)
        
        # Melt the dataframe from wide to long format
        self.long_data = pd.melt(self.data, 
                                 id_vars=id_vars, 
                                 value_vars=self.within_cols,
                                 var_name='time', # Standard name for the within-subject factor variable after melting
                                 value_name=self.dependent_var)
        
        # Track which rows will be dropped
        missing_mask = self.long_data.isnull().any(axis=1)
        dropped_original_indices = self.long_data.loc[missing_mask, '__original_index__'].unique().tolist()
        
        # Drop missing values
        self.long_data.dropna(inplace=True)
        
        # Store dropped row information
        self.results['n_dropped'] = len(dropped_original_indices)
        self.results['dropped_rows'] = sorted(dropped_original_indices)
        
        # Remove the tracking column
        if '__original_index__' in self.long_data.columns:
            self.long_data = self.long_data.drop(columns=['__original_index__'])


    def run_analysis(self):
        try:
            # Build arguments dynamically for rm_anova
            kwargs = {
                'data': self.long_data,
                'dv': self.dependent_var,
                'within': 'time', # This is now the standard name for the within-factor
                'subject': self.subject_col,
                'detailed': True,
                'effsize': "np2"
            }
            if self.between_col:
                kwargs['between'] = self.between_col
            
            aov = pg.rm_anova(**kwargs)

            # Convert NaN to None before creating the dictionary
            self.results['anova_table'] = aov.replace({np.nan: None}).to_dict('records')
            
            # Sphericity test is only relevant for within-subject effects with > 2 levels
            if len(self.within_cols) > 2:
                try:
                    sphericity_result = pg.sphericity(data=self.long_data, dv=self.dependent_var, within='time', subject=self.subject_col)
                    
                    if isinstance(sphericity_result, tuple):
                        # Older versions: (W, sphericity_bool, chi2, dof, pval)
                        w, spher, chi2, dof, pval = sphericity_result
                        self.results['mauchly_test'] = {
                            'W': float(w) if w is not None else None,
                            'spher': bool(spher) if spher is not None else None,
                            'chi2': float(chi2) if chi2 is not None else None,
                            'dof': int(dof) if dof is not None else None,
                            'p-val': float(pval) if pval is not None else None
                        }
                    else:
                        # Newer versions return DataFrame
                        result_dict = sphericity_result.to_dict('records')[0]
                        # Store all keys, converting NaN to None
                        converted = {}
                        for key, value in result_dict.items():
                            if pd.isna(value):
                                converted[key] = None
                            elif isinstance(value, (np.floating, float)):
                                converted[key] = float(value)
                            elif isinstance(value, (np.integer, int)):
                                converted[key] = int(value)
                            elif isinstance(value, (np.bool_, bool)):
                                converted[key] = bool(value)
                            else:
                                converted[key] = value
                        self.results['mauchly_test'] = converted
                        
                except Exception as e:
                    print(f"Sphericity test error: {e}", file=sys.stderr)
                    self.results['mauchly_test'] = None
            else:
                # Only 2 levels, sphericity not applicable
                self.results['mauchly_test'] = None


            # Post-hoc tests if significant interaction or main effect
            perform_posthoc = False
            main_effect_p_col = 'p-GG-corr' if 'p-GG-corr' in aov.columns and not pd.isna(aov.loc[aov['Source'] == 'time', 'p-GG-corr']).any() else 'p-unc'
            
            if self.between_col:
                interaction_row = aov[aov['Source'] == f'time * {self.between_col}']
                if not interaction_row.empty:
                    interaction_p_col = 'p-GG-corr' if 'p-GG-corr' in interaction_row.columns and not pd.isna(interaction_row['p-GG-corr'].iloc[0]) else 'p-unc'
                    if interaction_row[interaction_p_col].iloc[0] < self.alpha:
                        perform_posthoc = True
            else: # No between-subject factor, check main within-subject effect
                within_row = aov[aov['Source'] == 'time']
                if not within_row.empty and within_row[main_effect_p_col].iloc[0] < self.alpha:
                    perform_posthoc = True

            if perform_posthoc:
                posthoc_args = {
                    'data': self.long_data,
                    'dv': self.dependent_var,
                    'within': 'time',
                    'subject': self.subject_col,
                    'padjust': 'bonf'
                }
                if self.between_col:
                    posthoc_args['between'] = self.between_col
                
                posthoc = pg.pairwise_tests(**posthoc_args)
                self.results['posthoc_results'] = posthoc.replace({np.nan: None}).to_dict('records')
            
            # Generate interpretation
            self._generate_interpretation()

        except Exception as e:
            self.results['error'] = str(e)

    def _generate_interpretation(self):
        """Generate interpretation of the results"""
        interpretation = ""
        
        if 'error' in self.results or not self.results.get('anova_table'):
            return
        
        aov = self.results['anova_table']
        sphericity_violated = self.results.get('mauchly_test') and self.results['mauchly_test'].get('p-val', 1) < self.alpha
        
        # Helper function to format p-values
        def format_p(p):
            if p is None:
                return "p = N/A"
            if p < 0.001:
                return "p < .001"
            return f"p = {p:.3f}"
        
        # Helper function to get effect size interpretation
        def get_effect_size_interp(eta_squared):
            if eta_squared >= 0.14:
                return "large"
            elif eta_squared >= 0.06:
                return "medium"
            elif eta_squared >= 0.01:
                return "small"
            return "negligible"
        
        interpretation += "**Repeated Measures ANOVA Results**\n\n"
        
        # Sphericity check
        if self.results.get('mauchly_test'):
            interpretation += "**Sphericity Assumption**\n\n"
            mauchly = self.results['mauchly_test']
            w_val = mauchly.get('W', 'N/A')
            p_val = mauchly.get('p-val')
            
            if sphericity_violated:
                interpretation += (
                    f"Mauchly's test of sphericity was significant (W = {w_val:.3f if isinstance(w_val, (int, float)) else w_val}, "
                    f"{format_p(p_val)}), indicating that the sphericity assumption was violated. "
                    f"Therefore, Greenhouse-Geisser corrected p-values are reported below.\n\n"
                )
            else:
                interpretation += (
                    f"Mauchly's test of sphericity was not significant (W = {w_val:.3f if isinstance(w_val, (int, float)) else w_val}, "
                    f"{format_p(p_val)}), indicating that the sphericity assumption was met. "
                    f"Uncorrected p-values are reported.\n\n"
                )
        elif len(self.within_cols) == 2:
            interpretation += "**Sphericity Assumption**\n\n"
            interpretation += (
                "Sphericity assumption is not applicable for within-subjects factors with only two levels.\n\n"
            )
        
        # Within-subjects effect
        within_row = next((row for row in aov if row['Source'] == 'time'), None)
        if within_row:
            interpretation += "**Within-Subjects Effect (Time/Condition)**\n\n"
            
            p_col = 'p-GG-corr' if sphericity_violated and within_row.get('p-GG-corr') is not None else 'p-unc'
            p_value = within_row.get(p_col)
            f_value = within_row.get('F')
            df1 = within_row.get('ddof1', within_row.get('DF1'))
            df2 = within_row.get('ddof2', within_row.get('DF2'))
            eta_sq = within_row.get('np2', 0)
            
            is_significant = p_value is not None and p_value < self.alpha
            
            if is_significant:
                interpretation += (
                    f"There was a statistically significant effect of time/condition on {self.dependent_var}, "
                    f"F({df1}, {df2}) = {f_value:.2f}, {format_p(p_value)}, "
                    f"η²p = {eta_sq:.3f} ({get_effect_size_interp(eta_sq)} effect size).\n\n"
                )
                interpretation += (
                    f"This indicates that the scores differed significantly across the {len(self.within_cols)} measurement occasions. "
                )
                if self.results.get('posthoc_results'):
                    interpretation += "Post-hoc pairwise comparisons (see below) can identify which specific time points differ.\n\n"
                else:
                    interpretation += "\n\n"
            else:
                interpretation += (
                    f"There was NO statistically significant effect of time/condition on {self.dependent_var}, "
                    f"F({df1}, {df2}) = {f_value:.2f}, {format_p(p_value)}.\n\n"
                )
                interpretation += (
                    f"The scores did not differ significantly across the {len(self.within_cols)} measurement occasions.\n\n"
                )
        
        # Between-subjects effect (if applicable)
        if self.between_col:
            between_row = next((row for row in aov if row['Source'] == self.between_col), None)
            if between_row:
                interpretation += f"**Between-Subjects Effect ({self.between_col})**\n\n"
                
                p_value = between_row.get('p-unc')
                f_value = between_row.get('F')
                df1 = between_row.get('ddof1', between_row.get('DF1'))
                df2 = between_row.get('ddof2', between_row.get('DF2'))
                eta_sq = between_row.get('np2', 0)
                
                is_significant = p_value is not None and p_value < self.alpha
                
                if is_significant:
                    interpretation += (
                        f"There was a statistically significant between-subjects effect of {self.between_col}, "
                        f"F({df1}, {df2}) = {f_value:.2f}, {format_p(p_value)}, "
                        f"η²p = {eta_sq:.3f} ({get_effect_size_interp(eta_sq)} effect size).\n\n"
                    )
                    interpretation += f"Groups differed significantly on {self.dependent_var} overall.\n\n"
                else:
                    interpretation += (
                        f"There was NO statistically significant between-subjects effect of {self.between_col}, "
                        f"F({df1}, {df2}) = {f_value:.2f}, {format_p(p_value)}.\n\n"
                    )
                    interpretation += f"Groups did not differ significantly on {self.dependent_var} overall.\n\n"
            
            # Interaction effect
            interaction_row = next((row for row in aov if '*' in row['Source']), None)
            if interaction_row:
                interpretation += f"**Interaction Effect (Time × {self.between_col})**\n\n"
                
                p_col = 'p-GG-corr' if sphericity_violated and interaction_row.get('p-GG-corr') is not None else 'p-unc'
                p_value = interaction_row.get(p_col)
                f_value = interaction_row.get('F')
                df1 = interaction_row.get('ddof1', interaction_row.get('DF1'))
                df2 = interaction_row.get('ddof2', interaction_row.get('DF2'))
                eta_sq = interaction_row.get('np2', 0)
                
                is_significant = p_value is not None and p_value < self.alpha
                
                if is_significant:
                    interpretation += (
                        f"There was a statistically significant interaction between time and {self.between_col}, "
                        f"F({df1}, {df2}) = {f_value:.2f}, {format_p(p_value)}, "
                        f"η²p = {eta_sq:.3f} ({get_effect_size_interp(eta_sq)} effect size).\n\n"
                    )
                    interpretation += (
                        f"This indicates that the pattern of change over time differed between groups. "
                        f"The groups showed different trajectories across the measurement occasions.\n\n"
                    )
                else:
                    interpretation += (
                        f"There was NO statistically significant interaction between time and {self.between_col}, "
                        f"F({df1}, {df2}) = {f_value:.2f}, {format_p(p_value)}.\n\n"
                    )
                    interpretation += (
                        f"The pattern of change over time was similar across groups.\n\n"
                    )
        
        # Post-hoc results summary
        if self.results.get('posthoc_results'):
            interpretation += "**Post-hoc Comparisons**\n\n"
            posthoc = self.results['posthoc_results']
            significant_pairs = [p for p in posthoc if p.get('p-corr', 1) < self.alpha]
            
            if significant_pairs:
                interpretation += (
                    f"Bonferroni-corrected pairwise comparisons revealed {len(significant_pairs)} significant difference(s) "
                    f"out of {len(posthoc)} comparisons:\n\n"
                )
                for pair in significant_pairs[:5]:  # Show first 5
                    a = pair.get('A', 'N/A')
                    b = pair.get('B', 'N/A')
                    p_corr = pair.get('p-corr')
                    interpretation += f"• {a} vs {b}: {format_p(p_corr)}\n"
                if len(significant_pairs) > 5:
                    interpretation += f"• ... and {len(significant_pairs) - 5} more (see table below)\n"
                interpretation += "\n"
            else:
                interpretation += (
                    f"Bonferroni-corrected pairwise comparisons revealed no significant differences "
                    f"between individual time points after correction for multiple comparisons.\n\n"
                )
        
        self.results['interpretation'] = interpretation.strip()


    def plot_results(self):
        if 'error' in self.results or not hasattr(self, 'long_data') or self.long_data.empty:
            return None
        
        fig, ax = plt.subplots(figsize=(12, 8))
        
        hue = self.between_col if self.between_col else None
        
        sns.pointplot(data=self.long_data, 
                      x='time', 
                      y=self.dependent_var, 
                      hue=hue, 
                      ax=ax,
                      dodge=True,
                      errorbar='ci',
                      capsize=.1)
                      
        ax.set_title(f'Interaction Plot: {self.dependent_var} over Time', fontsize=16, fontweight='bold')
        ax.set_xlabel('Time / Condition', fontsize=14)
        ax.set_ylabel(f'Mean of {self.dependent_var}', fontsize=14)
        ax.tick_params(axis='both', which='major', labelsize=12)
        if hue:
            ax.legend(title=hue, fontsize=12, title_fontsize=13)
        ax.grid(True, linestyle='--', alpha=0.6)
        
        plt.tight_layout()
        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=150)
        plt.close(fig)
        buf.seek(0)
        return f"data:image/png;base64,{base64.b64encode(buf.read()).decode('utf-8')}"


def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        subject_col = payload.get('subjectCol')
        within_cols = payload.get('withinCols')
        dependent_var = payload.get('dependentVar', 'measurement')
        between_col = payload.get('betweenCol')

        if not all([data, subject_col, within_cols]):
            raise ValueError("Missing required parameters: data, subjectCol, withinCols")

        analysis = RepeatedMeasuresAnova(data, subject_col, within_cols, dependent_var, between_col)
        analysis.run_analysis()
        
        plot_image = analysis.plot_results()

        response = {
            'results': analysis.results,
            'plot': plot_image
        }
        
        sys.stdout.write(json.dumps(response, default=_to_native_type, ensure_ascii=False))

    except Exception as e:
        error_response = {"error": str(e)}
        sys.stderr.write(json.dumps(error_response))
        sys.exit(1)

if __name__ == '__main__':
    main()
    