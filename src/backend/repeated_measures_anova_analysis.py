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
import statsmodels.api as sm
from statsmodels.multivariate.manova import MANOVA
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
    def __init__(self, data, subject_col, within_cols, between_col=None, alpha=0.05):
        self.data = pd.DataFrame(data).copy()
        self.subject_col = subject_col
        self.within_cols = within_cols
        self.between_col = between_col
        self.alpha = alpha
        self.results = {}
        self._prepare_data()

    def _prepare_data(self):
        id_vars = [self.subject_col]
        if self.between_col:
            id_vars.append(self.between_col)

        # Ensure all within columns are numeric
        for col in self.within_cols:
            self.data[col] = pd.to_numeric(self.data[col], errors='coerce')
            
        self.wide_data = self.data[id_vars + self.within_cols].dropna()

    def run_analysis(self):
        try:
            formula_end = " * ".join([f"C({c})" for c in self.within_cols]) if len(self.within_cols) > 1 else self.within_cols[0]
            formula = f'{" + ".join(self.within_cols)} ~ {self.between_col}' if self.between_col else f'{" + ".join(self.within_cols)} ~ 1'
            
            # Use MANOVA for repeated measures
            manova = MANOVA.from_formula(formula, data=self.wide_data)
            mv_test_results = manova.mv_test()
            
            self.results['manova_results'] = {name: table.to_dict('records') for name, table in mv_test_results.results.items()}
            
            # For interpretation, we can still use pingouin for its simpler summary output
            self.run_pingouin_for_summary()

        except Exception as e:
            self.results['error'] = str(e)

    def run_pingouin_for_summary(self):
        long_data = pd.melt(self.wide_data, 
                            id_vars=[self.subject_col] + ([self.between_col] if self.between_col else []), 
                            value_vars=self.within_cols, 
                            var_name='time', 
                            value_name='score')

        aov = pg.rm_anova(data=long_data, dv='score', within='time', subject=self.subject_col, between=self.between_col, detailed=True)
        self.results['summary_table'] = aov.to_dict('records')

        sphericity = pg.sphericity(data=long_data, dv='score', within='time', subject=self.subject_col)
        self.results['sphericity'] = {
            'spher': sphericity.spher, 'p-val': sphericity.pvalue, 'W': sphericity.W
        }

    def plot_results(self):
        long_data = pd.melt(self.wide_data, 
                            id_vars=[self.subject_col] + ([self.between_col] if self.between_col else []), 
                            value_vars=self.within_cols, 
                            var_name='time', 
                            value_name='score')
        
        fig, ax = plt.subplots(figsize=(8, 6))
        sns.pointplot(data=long_data, x='time', y='score', hue=self.between_col, ax=ax, dodge=True, errorbar='ci')
        ax.set_title(f'Interaction Plot')
        ax.set_xlabel('Condition')
        ax.set_ylabel('Mean Score')
        if self.between_col:
            ax.legend(title=self.between_col)
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
        between_col = payload.get('betweenCol', None)

        if not all([data, subject_col, within_cols]):
            raise ValueError("Missing data, subjectCol, or withinCols")

        analysis = RepeatedMeasuresAnova(data, subject_col, within_cols, between_col)
        analysis.run_analysis()
        
        plot_image = analysis.plot_results()

        response = {
            'results': analysis.results,
            'plot': plot_image
        }
        
        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        error_response = {"error": str(e)}
        sys.stderr.write(json.dumps(error_response))
        sys.exit(1)

if __name__ == '__main__':
    main()