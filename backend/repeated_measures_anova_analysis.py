
import sys
import json
import numpy as np
import pandas as pd
import statsmodels.api as sm
from statsmodels.stats.anova import AnovaRM
import warnings
import matplotlib.pyplot as plt
import seaborn as sns
import io
import base64

warnings.filterwarnings('ignore')

def _to_native_type(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        if np.isnan(obj):
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
        self.dependent_var_template = dependent_var_template
        self.between_col = between_col
        self.alpha = alpha
        self.results = {}
        self._prepare_data()

    def _prepare_data(self):
        # Data needs to be in long format for AnovaRM
        id_vars = [self.subject_col]
        if self.between_col:
            id_vars.append(self.between_col)
        
        self.long_data = pd.melt(self.data, 
                                 id_vars=id_vars, 
                                 value_vars=self.within_cols,
                                 var_name='time', 
                                 value_name=self.dependent_var_template)
        self.long_data.dropna(inplace=True)


    def run_analysis(self):
        try:
            aov = AnovaRM(data=self.long_data, 
                          depvar=self.dependent_var_template, 
                          subject=self.subject_col,
                          within=['time'], 
                          between=[self.between_col] if self.between_col else None)
            res = aov.fit()
            
            anova_table = res.anova_table
            
            # Mauchly's test for sphericity
            mauchly_result = res.sphericity
            
            self.results['anova_table'] = anova_table.reset_index().to_dict('records')
            self.results['mauchly_test'] = {
                'statistic': mauchly_result[0],
                'p_value': mauchly_result[1],
                'sphericity_assumed': mauchly_result[1] > self.alpha if mauchly_result[1] is not None else True
            }
            
        except Exception as e:
            # Fallback for when AnovaRM fails (e.g., singular matrix)
            self.results['error'] = str(e)


    def plot_results(self):
        if 'error' in self.results:
            return None

        fig, ax = plt.subplots(figsize=(8, 6))
        
        hue = self.between_col if self.between_col else None
        
        sns.pointplot(data=self.long_data, 
                      x='time', 
                      y=self.dependent_var_template, 
                      hue=hue, 
                      ax=ax,
                      dodge=True,
                      errorbar='ci')
                      
        ax.set_title(f'Interaction Plot: {self.dependent_var_template} over Time')
        ax.set_xlabel('Time / Condition')
        ax.set_ylabel(f'Mean of {self.dependent_var_template}')
        if hue:
            ax.legend(title=hue)
        ax.grid(True, linestyle='--', alpha=0.6)
        
        plt.tight_layout()
        buf = io.BytesIO()
        plt.savefig(buf, format='png')
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
        
        print(json.dumps(response, default=_to_native_type, indent=2))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
