
import sys
import json
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import statsmodels.api as sm
import statsmodels.formula.api as smf
from scipy import stats
from sklearn.linear_model import LinearRegression
import warnings
import io
import base64
import math

warnings.filterwarnings('ignore')
plt.style.use('seaborn-v0_8-whitegrid')

def _to_native_type(obj):
    if isinstance(obj, np.integer): return int(obj)
    if isinstance(obj, (np.floating, float)):
        if np.isnan(obj) or np.isinf(obj): return None
        return float(obj)
    if isinstance(obj, np.ndarray): return obj.tolist()
    if isinstance(obj, np.bool_): return bool(obj)
    return obj

class EffectivenessAnalyzer:
    def __init__(self, data, outcome_var, time_var=None, group_var=None, covariates=None, alpha=0.05):
        self.df = pd.DataFrame(data).copy()
        self.outcome_var = outcome_var
        self.time_var = time_var
        self.group_var = group_var
        self.covariates = covariates or []
        self.alpha = alpha
        self.original_length = len(self.df)
        self._prepare_data()
        self.results = {}

    def _prepare_data(self):
        all_vars = [self.outcome_var]
        if self.time_var: all_vars.append(self.time_var)
        if self.group_var: all_vars.append(self.group_var)
        if self.covariates: all_vars.extend(self.covariates)
        
        self.df_clean = self.df[all_vars].dropna().copy()
        self.df_clean[self.outcome_var] = pd.to_numeric(self.df_clean[self.outcome_var], errors='coerce')
        if self.time_var:
            # Try numeric conversion first, then categorical
            try:
                self.df_clean[self.time_var] = pd.to_numeric(self.df_clean[self.time_var], errors='raise')
            except (ValueError, TypeError):
                 pass # Keep as object type if not numeric
        
        self.df_clean.dropna(subset=[self.outcome_var] + ([self.time_var] if self.time_var else []), inplace=True)
        
        if self.time_var:
            self.time_values = sorted(self.df_clean[self.time_var].unique())
            if len(self.time_values) != 2:
                # If not binary, disable time-based analysis for pre-post and did
                self.analysis_time_var = None
            else:
                 self.analysis_time_var = self.time_var
        else:
            self.analysis_time_var = None
        
        if self.group_var:
            self.group_values = sorted(self.df_clean[self.group_var].unique())
            if len(self.group_values) != 2:
                self.analysis_group_var = None
            else:
                self.analysis_group_var = self.group_var
        else:
            self.analysis_group_var = None


    def analyze_descriptive_stats(self):
        y = self.df_clean[self.outcome_var]
        overall = {'n': len(y), 'mean': y.mean(), 'std': y.std(), 'median': y.median(), 'min': y.min(), 'max': y.max(), 'q1': y.quantile(0.25), 'q3': y.quantile(0.75), 'se': y.sem()}
        
        by_group = {}
        if self.group_var:
            by_group = self.df_clean.groupby(self.group_var)[self.outcome_var].agg(['mean', 'std', 'count']).to_dict('index')

        by_time = {}
        if self.time_var:
            by_time = self.df_clean.groupby(self.time_var)[self.outcome_var].agg(['mean', 'std', 'count']).to_dict('index')
            
        by_group_time = {}
        if self.group_var and self.time_var:
            by_group_time = self.df_clean.groupby([self.group_var, self.time_var])[self.outcome_var].agg(['mean','std','count']).unstack().to_dict('index')


        fig, ax = plt.subplots(figsize=(8, 6))
        sns.histplot(y, kde=True, ax=ax, color='skyblue')
        ax.set_title(f'Distribution of {self.outcome_var}')
        buf = io.BytesIO(); fig.savefig(buf, format='png'); buf.seek(0)
        plot_base64 = base64.b64encode(buf.read()).decode('utf-8'); plt.close(fig)

        return {'overall': overall, 'by_group': by_group, 'by_time': by_time, 'by_group_time': by_group_time, 'plot': f"data:image/png;base64,{plot_base64}"}

    def analyze_pre_post(self):
        if not self.analysis_time_var: return None
        
        pre_label, post_label = self.time_values[0], self.time_values[1]
        pre_data = self.df_clean[self.df_clean[self.analysis_time_var] == pre_label][self.outcome_var]
        post_data = self.df_clean[self.df_clean[self.analysis_time_var] == post_label][self.outcome_var]

        ttest_res = stats.ttest_ind(post_data, pre_data, equal_var=False) # Welch's T-test
        mean_diff = post_data.mean() - pre_data.mean()
        
        pooled_std = np.sqrt((pre_data.std()**2 + post_data.std()**2) / 2) if len(pre_data) > 1 and len(post_data) > 1 else 0
        cohens_d = mean_diff / pooled_std if pooled_std > 0 else 0
        
        fig, ax = plt.subplots(figsize=(8, 6))
        sns.pointplot(x=self.analysis_time_var, y=self.outcome_var, data=self.df_clean, ax=ax)
        ax.set_title('Pre-Post Mean Comparison')
        buf = io.BytesIO(); fig.savefig(buf, format='png'); buf.seek(0)
        plot_base64 = base64.b64encode(buf.read()).decode('utf-8'); plt.close(fig)

        return {
            'overall': {
                'pre_mean': pre_data.mean(), 'post_mean': post_data.mean(), 'pre_std': pre_data.std(), 'post_std': post_data.std(),
                'difference': mean_diff, 'percent_change': (mean_diff / pre_data.mean()) * 100 if pre_data.mean() !=0 else None,
                'test_statistic': ttest_res.statistic, 'p_value': ttest_res.pvalue, 'test_used': "Welch's t-test",
                'effect_size': cohens_d, 'effect_interpretation': 'Large' if abs(cohens_d)>=0.8 else 'Medium' if abs(cohens_d)>=0.5 else 'Small',
                'significant': ttest_res.pvalue < self.alpha, 'pre_n': len(pre_data), 'post_n': len(post_data), 'pre_label': str(pre_label), 'post_label': str(post_label)
            },
            'by_group': {},
            'plot': f"data:image/png;base64,{plot_base64}"
        }

    def analyze_did(self):
        if not self.analysis_time_var or not self.analysis_group_var: return {"error": "DID requires binary time and group variables."}

        df_did = self.df_clean.copy()
        df_did['treat'] = (df_did[self.analysis_group_var] == self.group_values[1]).astype(int)
        df_did['post'] = (df_did[self.analysis_time_var] == self.time_values[1]).astype(int)
        df_did['did'] = df_did['treat'] * df_did['post']

        formula = f'Q("{self.outcome_var}") ~ treat + post + did'
        if self.covariates: formula += ' + ' + ' + '.join(f'Q("{c}")' for c in self.covariates)
        
        model = smf.ols(formula, data=df_did).fit(cov_type='HC1')
        did_res = model.summary2().tables[1].loc['did']
        
        cell_means = df_did.groupby(['treat', 'post'])[self.outcome_var].mean().to_dict()

        fig, ax = plt.subplots(figsize=(8, 6))
        sns.pointplot(x='post', y=self.outcome_var, hue='treat', data=df_did, ax=ax, dodge=True, errorbar='ci', capsize=.1)
        ax.set_xticklabels([str(self.time_values[0]), str(self.time_values[1])])
        handles, labels = ax.get_legend_handles_labels()
        ax.legend(handles, [str(self.group_values[0]), str(self.group_values[1])], title=self.analysis_group_var)
        ax.set_title('Difference-in-Differences'); ax.set_xlabel('Time'); ax.set_ylabel(f'Mean {self.outcome_var}');
        buf = io.BytesIO(); fig.savefig(buf, format='png'); buf.seek(0)
        plot_base64 = base64.b64encode(buf.read()).decode('utf-8'); plt.close(fig)

        return {
            'did_estimate': did_res['Coef.'], 'did_se': did_res['Std.Err.'], 'did_pvalue': did_res['P>|t|'],
            'did_ci_lower': did_res['[0.025'], 'did_ci_upper': did_res['0.975]'], 'significant': did_res['P>|t|'] < self.alpha,
            'r_squared': model.rsquared_adj,
            'cell_means': {'control_pre': cell_means.get((0,0)), 'control_post': cell_means.get((0,1)), 'treatment_pre': cell_means.get((1,0)), 'treatment_post': cell_means.get((1,1))},
            'control_change': cell_means.get((0,1), 0) - cell_means.get((0,0), 0), 'treatment_change': cell_means.get((1,1), 0) - cell_means.get((1,0), 0),
            'control_label': str(self.group_values[0]), 'treatment_label': str(self.group_values[1]),
            'plot': f"data:image/png;base64,{plot_base64}"
        }

    def analyze_trend(self):
        if not self.time_var: return None
        df_trend = self.df_clean.copy()
        
        # Simple numeric time for trend
        df_trend['time_numeric'] = pd.to_numeric(df_trend[self.time_var], errors='coerce')
        df_trend.dropna(subset=['time_numeric'], inplace=True)
        if len(df_trend['time_numeric'].unique()) < 2: return None

        X = sm.add_constant(df_trend['time_numeric'])
        model = sm.OLS(df_trend[self.outcome_var], X).fit()
        
        overall_trend = { 'slope': model.params[1], 'intercept': model.params[0], 'r_squared': model.rsquared, 'p_value': model.pvalues[1], 'std_err': model.bse[1], 'trend_direction': 'increasing' if model.params[1] > 0 else 'decreasing' if model.params[1] < 0 else 'flat', 'significant': model.pvalues[1] < self.alpha, 'time_points': df_trend['time_numeric'].tolist(), 'means': df_trend[self.outcome_var].tolist() }
        
        fig, ax = plt.subplots(figsize=(8, 6))
        sns.regplot(x=self.time_var, y=self.outcome_var, data=df_trend, ax=ax, ci=95)
        ax.set_title('Overall Trend')
        buf = io.BytesIO(); fig.savefig(buf, format='png'); buf.seek(0)
        plot_base64 = base64.b64encode(buf.read()).decode('utf-8'); plt.close(fig)

        return {'overall_trend': overall_trend, 'by_group': {}, 'plot': f"data:image/png;base64,{plot_base64}"}

    def analyze_sensitivity(self):
        if not self.analysis_time_var or not self.analysis_group_var: return None
        base_model = self.analyze_did()
        return {'base_model': base_model, 'with_covariates': None, 'robustness_check': None, 'plot': None}

    def generate_conclusion(self, results):
        did_res = results.get('did_analysis')
        pre_post_res = results.get('pre_post_comparison', {}).get('overall')
        trend_res = results.get('trend_analysis', {}).get('overall_trend')

        evidence = []
        if pre_post_res: evidence.append({'interpretation': f"Observed change of {pre_post_res['difference']:.2f}", 'statistic': f"p={pre_post_res['p_value']:.3f}", 'significant': pre_post_res['significant']})
        if did_res and not did_res.get('error'): evidence.append({'interpretation': f"DID causal estimate of {did_res['did_estimate']:.2f}", 'statistic': f"p={did_res['did_pvalue']:.3f}", 'significant': did_res['significant']})
        if trend_res: evidence.append({'interpretation': "Underlying trend exists", 'statistic': f"p={trend_res['p_value']:.3f}", 'significant': trend_res['significant']})

        is_effective = did_res and not did_res.get('error') and did_res['significant']
        
        conclusion = 'EFFECTIVE' if is_effective else 'NO CLEAR EFFECT' if pre_post_res and not pre_post_res['significant'] else 'LIKELY EFFECTIVE'
        
        text = f"The intervention appears to be **{conclusion.lower().replace('_', ' ')}**. "
        if conclusion == 'EFFECTIVE': text += f"The Difference-in-Differences (DID) analysis, which controls for external trends by using a control group, shows a statistically significant effect (p < {self.alpha}). This provides strong evidence that the intervention caused the observed changes."
        elif conclusion == 'LIKELY EFFECTIVE': text += "There is a significant change before and after the intervention. However, without a control group or robust DID result, we cannot be certain this change was caused by the intervention and not by an external trend."
        else: text += "There is no statistically significant change in the outcome variable, suggesting the intervention had little to no impact."

        return { 'conclusion': conclusion, 'conclusion_text': text, 'confidence_level': 'high' if conclusion == 'EFFECTIVE' else 'medium', 'evidence_points': evidence, 'recommendation': "Proceed with rollout, but monitor key metrics." if is_effective else "Re-evaluate the intervention strategy."}

def run_effectiveness_analysis(data, outcome_var, time_var=None, group_var=None, covariates=None, alpha=0.05):
    analyzer = EffectivenessAnalyzer(data=data, outcome_var=outcome_var, time_var=time_var, group_var=group_var, covariates=covariates, alpha=alpha)
    results = {
        'descriptive_stats': analyzer.analyze_descriptive_stats(),
        'pre_post_comparison': analyzer.analyze_pre_post(),
        'did_analysis': analyzer.analyze_did(),
        'trend_analysis': analyzer.analyze_trend(),
        'sensitivity_analysis': analyzer.analyze_sensitivity(),
        'effect_size_analysis': {'plot': None}, # Placeholder
        'summary_statistics': {'n_total': analyzer.original_length, 'n_valid': len(analyzer.df_clean), 'outcome_var': analyzer.outcome_var, 'time_var': analyzer.time_var, 'group_var': analyzer.group_var, 'covariates': analyzer.covariates}
    }
    results['overall_conclusion'] = analyzer.generate_conclusion(results)
    return json.loads(json.dumps(results, default=_to_native_type))

if __name__ == '__main__':
    try:
        payload = json.load(sys.stdin)
        results = run_effectiveness_analysis(**payload)
        print(json.dumps(results, default=_to_native_type, indent=2))
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)
