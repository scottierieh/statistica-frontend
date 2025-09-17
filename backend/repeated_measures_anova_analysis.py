
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

warnings.filterwarnings('ignore')

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

class RepeatedMeasuresAnova:
    def __init__(self, data, subject_col, within_cols, dependent_var_template, between_col=None, alpha=0.05):
        self.data = pd.DataFrame(data).copy()
        self.subject_col = subject_col
        self.within_cols = within_cols
        self.within_name = 'time' # Standard name for within-subject factor
        self.dependent_var = dependent_var_template
        self.between_col = between_col
        self.alpha = alpha
        self.results = {}
        self._prepare_data()

    def _prepare_data(self):
        id_vars = [self.subject_col]
        if self.between_col and self.between_col in self.data.columns:
            id_vars.append(self.between_col)
        
        self.long_data = pd.melt(self.data, 
                                 id_vars=id_vars, 
                                 value_vars=self.within_cols,
                                 var_name=self.within_name, 
                                 value_name=self.dependent_var)
        self.long_data.dropna(inplace=True)


    def run_analysis(self):
        try:
            aov = pg.rm_anova(data=self.long_data,
                              dv=self.dependent_var,
                              within=self.within_name,
                              subject=self.subject_col,
                              between=self.between_col if self.between_col else None,
                              detailed=True,
                              effsize="np2")

            self.results['anova_table'] = aov.to_dict('records')
            
            # Sphericity test
            sphericity_test = pg.sphericity(data=self.long_data, dv=self.dependent_var, within=self.within_name, subject=self.subject_col)
            if isinstance(sphericity_test, tuple): # Older pingouin versions
                 self.results['mauchly_test'] = {'spher': sphericity_test[0], 'p-value': sphericity_test[1]}
            else: # Newer pingouin versions return dataframe
                 self.results['mauchly_test'] = sphericity_test.to_dict('records')[0]


            # Post-hoc tests if significant interaction
            interaction_row = aov[aov['Source'] == f'{self.within_name} * {self.between_col}'] if self.between_col else None
            if interaction_row is not None and not interaction_row.empty and interaction_row['p-GG-corr'].iloc[0] < self.alpha:
                posthoc = pg.pairwise_tests(data=self.long_data, dv=self.dependent_var, within=self.within_name, subject=self.subject_col, between=self.between_col)
                self.results['posthoc_results'] = posthoc.to_dict('records')

        except Exception as e:
            self.results['error'] = str(e)


    def plot_results(self):
        if 'error' in self.results or not self.long_data.empty:
            fig, ax = plt.subplots(figsize=(8, 6))
            
            hue = self.between_col if self.between_col else None
            
            sns.pointplot(data=self.long_data, 
                          x=self.within_name, 
                          y=self.dependent_var, 
                          hue=hue, 
                          ax=ax,
                          dodge=True,
                          errorbar='ci')
                          
            ax.set_title(f'Interaction Plot: {self.dependent_var} over Time')
            ax.set_xlabel('Time / Condition')
            ax.set_ylabel(f'Mean of {self.dependent_var}')
            if hue:
                ax.legend(title=hue)
            ax.grid(True, linestyle='--', alpha=0.6)
            
            plt.tight_layout()
            buf = io.BytesIO()
            plt.savefig(buf, format='png')
            plt.close(fig)
            buf.seek(0)
            return f"data:image/png;base64,{base64.b64encode(buf.read()).decode('utf-8')}"
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

        analysis = RepeatedMeasuresAnova(data, subject_col, within_cols, dependent_var, between_col)
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
