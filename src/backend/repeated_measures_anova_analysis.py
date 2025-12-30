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

# Set seaborn style globally
sns.set_theme(style="darkgrid")
sns.set_context("notebook", font_scale=1.1)

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
        self.dependent_var = dependent_var_template
        self.between_col = between_col
        self.alpha = alpha
        self.results = {}
        self._prepare_data()

    def _prepare_data(self):
        id_vars = [self.subject_col]
        if self.between_col and self.between_col in self.data.columns:
            id_vars.append(self.between_col)
        
        # Melt the dataframe from wide to long format
        self.long_data = pd.melt(self.data, 
                                 id_vars=id_vars, 
                                 value_vars=self.within_cols,
                                 var_name='time',
                                 value_name=self.dependent_var)
        self.long_data.dropna(inplace=True)
        
        # Convert dependent variable to numeric
        self.long_data[self.dependent_var] = pd.to_numeric(self.long_data[self.dependent_var], errors='coerce')
        self.long_data.dropna(inplace=True)

    def run_analysis(self):
        try:
            if self.long_data.empty or len(self.long_data) < 3:
                raise ValueError("Not enough valid data for analysis")
            
            # Build arguments dynamically for rm_anova
            kwargs = {
                'data': self.long_data,
                'dv': self.dependent_var,
                'within': 'time',
                'subject': self.subject_col,
                'detailed': True,
                'effsize': "np2"
            }
            if self.between_col and self.between_col in self.long_data.columns:
                kwargs['between'] = self.between_col
            
            aov = pg.rm_anova(**kwargs)

            # Rename 'time' to more readable format and add source type
            anova_records = []
            for _, row in aov.iterrows():
                record = row.to_dict()
                source = record.get('Source', '')
                
                # Map source names for frontend compatibility
                if source == 'time':
                    record['Source'] = 'Within (Time)'
                    record['source_type'] = 'within'
                elif self.between_col and source == self.between_col:
                    record['Source'] = f'Between ({self.between_col})'
                    record['source_type'] = 'between'
                elif '*' in str(source):
                    record['Source'] = 'Interaction'
                    record['source_type'] = 'interaction'
                else:
                    record['source_type'] = 'other'
                
                # Handle NaN values
                for key, value in record.items():
                    if isinstance(value, float) and (math.isnan(value) or math.isinf(value)):
                        record[key] = None
                
                anova_records.append(record)
            
            self.results['anova_table'] = anova_records
            
            # Sphericity test (only for within-subject effects with > 2 levels)
            if len(self.within_cols) > 2:
                try:
                    sphericity_result = pg.sphericity(
                        data=self.long_data, 
                        dv=self.dependent_var, 
                        within='time', 
                        subject=self.subject_col
                    )
                    
                    if isinstance(sphericity_result, tuple):
                        w, spher, chi2, dof, pval = sphericity_result
                        self.results['mauchly_test'] = {
                            'W': _to_native_type(w),
                            'spher': bool(spher),
                            'chi2': _to_native_type(chi2),
                            'dof': _to_native_type(dof),
                            'p-val': _to_native_type(pval)
                        }
                    elif isinstance(sphericity_result, pd.DataFrame):
                        spher_dict = sphericity_result.to_dict('records')[0]
                        self.results['mauchly_test'] = {
                            'W': _to_native_type(spher_dict.get('W', spher_dict.get('W-spher'))),
                            'spher': bool(spher_dict.get('spher', True)),
                            'chi2': _to_native_type(spher_dict.get('chi2')),
                            'dof': _to_native_type(spher_dict.get('dof')),
                            'p-val': _to_native_type(spher_dict.get('pval', spher_dict.get('p-val')))
                        }
                    else:
                        self.results['mauchly_test'] = None
                except Exception as e:
                    self.results['mauchly_test'] = None
            else:
                self.results['mauchly_test'] = None

            # Determine which p-value to use for significance
            sphericity_violated = (self.results.get('mauchly_test') and 
                                   self.results['mauchly_test'].get('p-val') is not None and
                                   self.results['mauchly_test']['p-val'] < self.alpha)
            
            # Find within-subjects effect for interpretation
            within_row = next((r for r in anova_records if r.get('source_type') == 'within'), None)
            
            if within_row:
                if sphericity_violated and within_row.get('p-GG-corr') is not None:
                    main_p = within_row['p-GG-corr']
                    p_type = 'Greenhouse-Geisser corrected'
                else:
                    main_p = within_row.get('p-unc')
                    p_type = 'uncorrected'
                
                effect_size = within_row.get('np2', 0)
                f_stat = within_row.get('F', 0)
                
                # Effect size interpretation
                if effect_size and effect_size >= 0.14:
                    effect_interp = 'large'
                elif effect_size and effect_size >= 0.06:
                    effect_interp = 'medium'
                elif effect_size and effect_size >= 0.01:
                    effect_interp = 'small'
                else:
                    effect_interp = 'negligible'
                
                # Generate interpretation
                if main_p is not None and main_p < self.alpha:
                    self.results['interpretation'] = (
                        f"There was a statistically significant effect of time/condition on {self.dependent_var}, "
                        f"F = {f_stat:.2f}, p {'< .001' if main_p < 0.001 else f'= {main_p:.3f}'} ({p_type}), "
                        f"with a {effect_interp} effect size (η²p = {effect_size:.3f})."
                    )
                else:
                    self.results['interpretation'] = (
                        f"There was no statistically significant effect of time/condition on {self.dependent_var}, "
                        f"F = {f_stat:.2f}, p = {main_p:.3f} ({p_type}), "
                        f"η²p = {effect_size:.3f}."
                    )
            
            # Post-hoc tests if significant
            perform_posthoc = False
            
            if within_row:
                p_col = 'p-GG-corr' if sphericity_violated and within_row.get('p-GG-corr') is not None else 'p-unc'
                if within_row.get(p_col) is not None and within_row[p_col] < self.alpha:
                    perform_posthoc = True

            if perform_posthoc:
                try:
                    posthoc_args = {
                        'data': self.long_data,
                        'dv': self.dependent_var,
                        'within': 'time',
                        'subject': self.subject_col,
                        'padjust': 'bonf'
                    }
                    if self.between_col and self.between_col in self.long_data.columns:
                        posthoc_args['between'] = self.between_col
                    
                    posthoc = pg.pairwise_tests(**posthoc_args)
                    
                    posthoc_records = []
                    for _, row in posthoc.iterrows():
                        record = row.to_dict()
                        for key, value in record.items():
                            if isinstance(value, float) and (math.isnan(value) or math.isinf(value)):
                                record[key] = None
                        posthoc_records.append(record)
                    
                    self.results['posthoc_results'] = posthoc_records
                except Exception as e:
                    self.results['posthoc_error'] = str(e)

            # Descriptive statistics
            desc_stats = self.long_data.groupby('time')[self.dependent_var].agg(['mean', 'std', 'count']).reset_index()
            self.results['descriptives'] = desc_stats.to_dict('records')

        except Exception as e:
            self.results['error'] = str(e)

    def plot_results(self):
        if 'error' in self.results or not hasattr(self, 'long_data') or self.long_data.empty:
            return None
        
        try:
            fig, axes = plt.subplots(1, 2, figsize=(14, 6))
            
            # Plot 1: Point plot with error bars
            ax1 = axes[0]
            hue = self.between_col if self.between_col and self.between_col in self.long_data.columns else None
            
            sns.pointplot(
                data=self.long_data, 
                x='time', 
                y=self.dependent_var, 
                hue=hue, 
                ax=ax1,
                dodge=0.3 if hue else False,
                errorbar='ci',
                capsize=0.1,
                palette='crest' if hue else None
            )
            
            ax1.set_title(f'Mean {self.dependent_var} by Time/Condition', fontsize=12, fontweight='bold')
            ax1.set_xlabel('Time / Condition', fontsize=11)
            ax1.set_ylabel(f'Mean {self.dependent_var}', fontsize=11)
            if hue:
                ax1.legend(title=hue)
            ax1.grid(True, linestyle='--', alpha=0.6)
            
            # Plot 2: Box plot
            ax2 = axes[1]
            sns.boxplot(
                data=self.long_data, 
                x='time', 
                y=self.dependent_var, 
                hue=hue,
                ax=ax2,
                palette='crest'
            )
            
            ax2.set_title(f'Distribution of {self.dependent_var}', fontsize=12, fontweight='bold')
            ax2.set_xlabel('Time / Condition', fontsize=11)
            ax2.set_ylabel(self.dependent_var, fontsize=11)
            if hue:
                ax2.legend(title=hue)
            
            plt.tight_layout()
            
            buf = io.BytesIO()
            plt.savefig(buf, format='png', dpi=100, bbox_inches='tight')
            plt.close(fig)
            buf.seek(0)
            return f"data:image/png;base64,{base64.b64encode(buf.read()).decode('utf-8')}"
            
        except Exception as e:
            return None


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

        if len(within_cols) < 2:
            raise ValueError("At least 2 within-subject columns are required")

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

    