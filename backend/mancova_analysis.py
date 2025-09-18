
import sys
import json
import numpy as np
import pandas as pd
import statsmodels.api as sm
from statsmodels.multivariate.manova import MANOVA
import warnings
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

class MancovaAnalysis:
    def __init__(self, data, dependent_vars, factor_var, covariate_vars, alpha=0.05):
        self.data = pd.DataFrame(data).copy()
        self.dependent_vars = dependent_vars
        self.factor_var = factor_var
        self.covariate_vars = covariate_vars
        self.alpha = alpha
        self.results = {}
        self._prepare_data()

    def _prepare_data(self):
        all_vars = self.dependent_vars + self.covariate_vars + [self.factor_var]
        self.clean_data = self.data[all_vars].dropna().copy()

        # Sanitize column names
        self.dv_clean = [v.replace(' ', '_').replace('.', '_') for v in self.dependent_vars]
        self.cv_clean = [v.replace(' ', '_').replace('.', '_') for v in self.covariate_vars]
        self.fv_clean = self.factor_var.replace(' ', '_').replace('.', '_')

        rename_dict = {**dict(zip(self.dependent_vars, self.dv_clean)),
                       **dict(zip(self.covariate_vars, self.cv_clean)),
                       self.factor_var: self.fv_clean}
        self.clean_data.rename(columns=rename_dict, inplace=True)

    def _generate_interpretation(self):
        if 'multivariate_tests' not in self.results:
            return "Analysis did not complete successfully."

        interpretation = f"A One-Way MANCOVA was conducted to examine the effect of '{self.factor_var}' on the multivariate pattern of {', '.join(self.dependent_vars)}, while controlling for {', '.join(self.covariate_vars)}.\n"
        
        wilks = self.results['multivariate_tests'].get('Wilks\' lambda')
        if wilks:
            p_val_text = f"p < .001" if wilks['p-value'] < 0.001 else f"p = {wilks['p-value']:.3f}"
            sig_text = "significant" if wilks['p-value'] < self.alpha else "not significant"
            
            interpretation += (
                f"The analysis revealed a statistically {sig_text} effect of '{self.factor_var}' on the combined dependent variables after controlling for the covariates "
                f"(Wilks' Lambda = {wilks['Value']:.3f}, F({wilks['Num DF']:.0f}, {wilks['Den DF']:.0f}) = {wilks['F Value']:.2f}, {p_val_text}).\n"
            )

        if 'univariate_tests' in self.results:
            interpretation += "\nFollow-up univariate ANCOVAs were conducted for each dependent variable.\n"
            for dv, res in self.results['univariate_tests'].items():
                p_val_text = f"p < .001" if res['p-value'] < 0.001 else f"p = {res['p-value']:.3f}"
                sig_text = "a significant" if res['p-value'] < self.alpha else "no significant"
                interpretation += (
                    f"- For '{dv}', there was {sig_text} effect of '{self.factor_var}' "
                    f"(F({res['df']:.0f}, {res['df_resid']:.0f}) = {res['F']:.2f}, {p_val_text}, partial η² = {res['eta_sq_partial']:.3f}).\n"
                )

        if 'posthoc_tests' in self.results and any(self.results['posthoc_tests'].values()):
            interpretation += "\nPost-hoc comparisons using Tukey's HSD revealed significant differences between specific groups for some dependent variables."

        return interpretation.strip()

    def run_analysis(self):
        # Formula for MANCOVA
        dv_formula = ' + '.join([f'Q("{v}")' for v in self.dv_clean])
        iv_formula = f'C(Q("{self.fv_clean}")) + ' + ' + '.join([f'Q("{c}")' for c in self.cv_clean])
        formula = f"{dv_formula} ~ {iv_formula}"

        try:
            mancova = MANOVA.from_formula(formula, data=self.clean_data)
            mv_test_results = mancova.mv_test()
            self.results['multivariate_tests'] = mv_test_results.results[self.fv_clean]['mv test'].to_dict('index')

            # Univariate ANCOVAs
            univariate_tests = {}
            for dv in self.dv_clean:
                formula_uv = f'Q("{dv}") ~ C(Q("{self.fv_clean}")) + ' + ' + '.join([f'Q("{c}")' for c in self.cv_clean])
                model_uv = sm.formula.ols(formula_uv, data=self.clean_data).fit()
                anova_uv = sm.stats.anova_lm(model_uv, typ=2)
                
                factor_res = anova_uv.loc[f'C(Q("{self.fv_clean}"))']
                resid_res = anova_uv.loc['Residual']
                
                eta_sq_partial = factor_res['sum_sq'] / (factor_res['sum_sq'] + resid_res['sum_sq'])
                
                original_dv_name = self.dependent_vars[self.dv_clean.index(dv)]
                univariate_tests[original_dv_name] = {
                    'F': factor_res['F'],
                    'p-value': factor_res['PR(>F)'],
                    'df': factor_res['df'],
                    'df_resid': resid_res['df'],
                    'eta_sq_partial': eta_sq_partial
                }
            self.results['univariate_tests'] = univariate_tests
            
            # Simplified post-hoc for significant univariate tests
            posthoc_tests = {}
            for dv, res in univariate_tests.items():
                if res['p-value'] < self.alpha:
                     dv_clean_name = self.dv_clean[self.dependent_vars.index(dv)]
                     tukey = sm.stats.multicomp.pairwise_tukeyhsd(endog=self.clean_data[dv_clean_name], groups=self.clean_data[self.fv_clean], alpha=self.alpha)
                     posthoc_tests[dv] = pd.DataFrame(data=tukey._results_table.data[1:], columns=tukey._results_table.data[0]).to_dict('records')
            self.results['posthoc_tests'] = posthoc_tests

            self.results['interpretation'] = self._generate_interpretation()


        except Exception as e:
            self.results['error'] = str(e)

        return self.results

def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        dependent_vars = payload.get('dependentVars')
        factor_var = payload.get('factorVar')
        covariate_vars = payload.get('covariateVars')

        if not all([data, dependent_vars, factor_var, covariate_vars]):
            raise ValueError("Missing required parameters.")

        analysis = MancovaAnalysis(data, dependent_vars, factor_var, covariate_vars)
        results = analysis.run_analysis()

        response = {'results': results}
        print(json.dumps(response, default=_to_native_type, indent=2))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
