
import sys
import json
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from scipy import stats
from scipy.stats import f, levene, shapiro, normaltest
from itertools import combinations
import warnings
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

class TwoWayANOVA:
    def __init__(self, data, dependent_var, factor_a, factor_b, 
                 alpha=0.05, effect_size='partial_eta_squared'):
        self.data = data.copy()
        self.dependent_var = dependent_var
        self.factor_a = factor_a
        self.factor_b = factor_b
        self.alpha = alpha
        self.effect_size_type = effect_size
        self._prepare_data()
        self.results = {}
        
    def _prepare_data(self):
        required_cols = [self.dependent_var, self.factor_a, self.factor_b]
        self.clean_data = self.data[required_cols].dropna().copy()
        self.factor_a_levels = sorted(self.clean_data[self.factor_a].unique())
        self.factor_b_levels = sorted(self.clean_data[self.factor_b].unique())
        self.clean_data[self.factor_a] = self.clean_data[self.factor_a].astype('category')
        self.clean_data[self.factor_b] = self.clean_data[self.factor_b].astype('category')
        self.cell_counts = self.clean_data.groupby([self.factor_a, self.factor_b]).size()
        self.design_type = "Balanced" if self.cell_counts.std() == 0 else "Unbalanced"
        self.n_a = len(self.factor_a_levels)
        self.n_b = len(self.factor_b_levels)
        self.n_total = len(self.clean_data)
        self.cell_stats = self.clean_data.groupby([self.factor_a, self.factor_b])[self.dependent_var].agg(['mean', 'count', 'std']).reset_index()
        self.grand_mean = self.clean_data[self.dependent_var].mean()
    
    def run_anova(self):
        self._calculate_sum_of_squares()
        self._calculate_degrees_of_freedom()
        self._calculate_f_statistics()
        self._calculate_p_values()
        self._calculate_effect_sizes()
        self._create_anova_table()
        self._calculate_marginal_means()
        return self.results['anova_table']
    
    def _calculate_sum_of_squares(self):
        y = self.clean_data[self.dependent_var].values
        self.ss_total = np.sum((y - self.grand_mean) ** 2)
        
        ss_model = 0
        for a_level in self.factor_a_levels:
            for b_level in self.factor_b_levels:
                cell_data = self.clean_data[(self.clean_data[self.factor_a] == a_level) & (self.clean_data[self.factor_b] == b_level)]
                if len(cell_data) > 0:
                    ss_model += len(cell_data) * (cell_data[self.dependent_var].mean() - self.grand_mean)**2

        self.ss_error = self.ss_total - ss_model

        model = f'`{self.dependent_var}` ~ C(`{self.factor_a}`) * C(`{self.factor_b}`)'
        from statsmodels.formula.api import ols
        from statsmodels.stats.anova import anova_lm
        
        lm = ols(model, data=self.clean_data).fit()
        anova_results = anova_lm(lm, typ=2)
        
        self.ss_a = anova_results.loc[f"C(`{self.factor_a}`)", 'sum_sq']
        self.ss_b = anova_results.loc[f"C(`{self.factor_b}`)", 'sum_sq']
        self.ss_ab = anova_results.loc[f"C(`{self.factor_a}`):C(`{self.factor_b}`)", 'sum_sq']
        self.ss_error = anova_results.loc['Residual', 'sum_sq']
    
    def _calculate_degrees_of_freedom(self):
        self.df_total = self.n_total - 1
        self.df_a = self.n_a - 1
        self.df_b = self.n_b - 1
        self.df_ab = self.df_a * self.df_b
        self.df_error = self.n_total - (self.n_a * self.n_b)
    
    def _calculate_f_statistics(self):
        self.ms_a = self.ss_a / self.df_a if self.df_a > 0 else 0
        self.ms_b = self.ss_b / self.df_b if self.df_b > 0 else 0
        self.ms_ab = self.ss_ab / self.df_ab if self.df_ab > 0 else 0
        self.ms_error = self.ss_error / self.df_error if self.df_error > 0 else 0
        self.f_a = self.ms_a / self.ms_error if self.ms_error > 0 else np.inf
        self.f_b = self.ms_b / self.ms_error if self.ms_error > 0 else np.inf
        self.f_ab = self.ms_ab / self.ms_error if self.ms_error > 0 else np.inf
    
    def _calculate_p_values(self):
        self.p_a = 1 - f.cdf(self.f_a, self.df_a, self.df_error) if self.df_a > 0 and self.df_error > 0 else 1
        self.p_b = 1 - f.cdf(self.f_b, self.df_b, self.df_error) if self.df_b > 0 and self.df_error > 0 else 1
        self.p_ab = 1 - f.cdf(self.f_ab, self.df_ab, self.df_error) if self.df_ab > 0 and self.df_error > 0 else 1
    
    def _calculate_effect_sizes(self):
        self.eta_sq_a = self.ss_a / self.ss_total
        self.eta_sq_b = self.ss_b / self.ss_total
        self.eta_sq_ab = self.ss_ab / self.ss_total
        self.partial_eta_sq_a = self.ss_a / (self.ss_a + self.ss_error)
        self.partial_eta_sq_b = self.ss_b / (self.ss_b + self.ss_error)
        self.partial_eta_sq_ab = self.ss_ab / (self.ss_ab + self.ss_error)
    
    def _create_anova_table(self):
        table_data = pd.DataFrame({
            'Source': [self.factor_a, self.factor_b, f'{self.factor_a} × {self.factor_b}', 'Error', 'Total'],
            'SS': [self.ss_a, self.ss_b, self.ss_ab, self.ss_error, self.ss_total],
            'df': [self.df_a, self.df_b, self.df_ab, self.df_error, self.df_total],
            'MS': [self.ms_a, self.ms_b, self.ms_ab, self.ms_error, np.nan],
            'F': [self.f_a, self.f_b, self.f_ab, np.nan, np.nan],
            'p-value': [self.p_a, self.p_b, self.p_ab, np.nan, np.nan],
            'η²p': [self.partial_eta_sq_a, self.partial_eta_sq_b, self.partial_eta_sq_ab, np.nan, np.nan]
        })
        self.results['anova_table'] = table_data.replace({np.nan: None}).to_dict('records')

    
    def _calculate_marginal_means(self):
        factor_a_stats = self.clean_data.groupby(self.factor_a)[self.dependent_var].agg(['mean', 'count', 'std']).reset_index()
        factor_a_stats['se'] = factor_a_stats['std'] / np.sqrt(factor_a_stats['count'])
        factor_b_stats = self.clean_data.groupby(self.factor_b)[self.dependent_var].agg(['mean', 'count', 'std']).reset_index()
        factor_b_stats['se'] = factor_b_stats['std'] / np.sqrt(factor_b_stats['count'])
        cell_means = self.clean_data.groupby([self.factor_a, self.factor_b])[self.dependent_var].agg(['mean', 'count', 'std']).reset_index()
        cell_means['se'] = cell_means['std'] / np.sqrt(cell_means['count'])
        self.results['marginal_means'] = {
            'factor_a': factor_a_stats.replace({np.nan: None}).to_dict('records'),
            'factor_b': factor_b_stats.replace({np.nan: None}).to_dict('records'),
            'cells': cell_means.replace({np.nan: None}).to_dict('records')
        }
        
    def test_assumptions(self):
        assumptions = {}
        residuals = self._calculate_residuals()
        
        if len(residuals) <= 5000 and len(residuals) >=3:
            shapiro_stat, shapiro_p = shapiro(residuals)
            assumptions['normality'] = {'test': 'Shapiro-Wilk', 'statistic': shapiro_stat, 'p_value': shapiro_p, 'assumption_met': shapiro_p > self.alpha}
        elif len(residuals) > 3:
            dagostino_stat, dagostino_p = normaltest(residuals)
            assumptions['normality'] = {'test': "D'Agostino-Pearson", 'statistic': dagostino_stat, 'p_value': dagostino_p, 'assumption_met': dagostino_p > self.alpha}
        else:
            assumptions['normality'] = {'test': 'Normality Test', 'statistic': np.nan, 'p_value': np.nan, 'assumption_met': False, 'note': 'Not enough data'}

        groups = [group[self.dependent_var].values for name, group in self.clean_data.groupby([self.factor_a, self.factor_b])]
        
        if len(groups) > 1 and all(len(g) > 0 for g in groups):
             levene_stat, levene_p = levene(*groups)
             assumptions['homogeneity'] = {'test': "Levene's Test", 'statistic': levene_stat, 'p_value': levene_p, 'assumption_met': levene_p > self.alpha}
        else:
             assumptions['homogeneity'] = {'test': "Levene's Test", 'statistic': np.nan, 'p_value': np.nan, 'assumption_met': False}

        self.results['assumptions'] = assumptions
        return assumptions

    def _calculate_residuals(self):
        residuals = []
        for _, row in self.clean_data.iterrows():
            cell_mean_series = self.cell_stats[(self.cell_stats[self.factor_a] == row[self.factor_a]) & (self.cell_stats[self.factor_b] == row[self.factor_b])]['mean']
            if not cell_mean_series.empty:
                cell_mean = cell_mean_series.iloc[0]
                residuals.append(row[self.dependent_var] - cell_mean)
        return np.array(residuals)

    def plot_results(self, figsize=(15, 10)):
        if not self.results: return None
        fig, axes = plt.subplots(2, 2, figsize=figsize)
        fig.suptitle('Two-Way ANOVA Results', fontsize=16, fontweight='bold')
        self._plot_interaction(axes[0, 0])
        self._plot_marginal_means(axes[0, 1], axes[1, 0])
        self._plot_residual_qq(axes[1, 1])
        plt.tight_layout(rect=[0, 0.03, 1, 0.95])
        
        buf = io.BytesIO()
        plt.savefig(buf, format='png')
        plt.close(fig)
        buf.seek(0)
        image_base64 = base64.b64encode(buf.read()).decode('utf-8')
        return f"data:image/png;base64,{image_base64}"

    def _plot_interaction(self, ax):
        cell_means = pd.DataFrame(self.results['marginal_means']['cells'])
        pivot_data = cell_means.pivot(index=self.factor_a, columns=self.factor_b, values='mean')
        for b_level in self.factor_b_levels:
            if b_level in pivot_data.columns:
                ax.plot(self.factor_a_levels, pivot_data[b_level], marker='o', linewidth=2, markersize=6, label=f'{self.factor_b}: {b_level}')
        ax.set_xlabel(self.factor_a)
        ax.set_ylabel(f'Mean {self.dependent_var}')
        ax.set_title('Interaction Plot')
        ax.legend()
        ax.grid(True, alpha=0.3)
        if self.p_ab < self.alpha:
            ax.text(0.05, 0.95, f'Interaction: p = {self.p_ab:.4f}*', transform=ax.transAxes, va='top', bbox=dict(boxstyle="round,pad=0.3", facecolor="yellow", alpha=0.7))

    def _plot_marginal_means(self, ax1, ax2):
        factor_a_means = pd.DataFrame(self.results['marginal_means']['factor_a'])
        ax1.bar(range(len(factor_a_means)), factor_a_means['mean'], yerr=factor_a_means['se'], capsize=5, color='skyblue', alpha=0.7, edgecolor='black')
        ax1.set_xlabel(self.factor_a)
        ax1.set_ylabel(f'Mean {self.dependent_var}')
        ax1.set_title(f'{self.factor_a} Main Effect')
        ax1.set_xticks(range(len(factor_a_means)))
        ax1.set_xticklabels(factor_a_means[self.factor_a])
        ax1.grid(True, alpha=0.3)
        if self.p_a < self.alpha:
            ax1.text(0.05, 0.95, f'p = {self.p_a:.4f}*', transform=ax1.transAxes, va='top', bbox=dict(boxstyle="round,pad=0.3", facecolor="lightgreen", alpha=0.7))
        
        factor_b_means = pd.DataFrame(self.results['marginal_means']['factor_b'])
        ax2.bar(range(len(factor_b_means)), factor_b_means['mean'], yerr=factor_b_means['se'], capsize=5, color='lightcoral', alpha=0.7, edgecolor='black')
        ax2.set_xlabel(self.factor_b)
        ax2.set_ylabel(f'Mean {self.dependent_var}')
        ax2.set_title(f'{self.factor_b} Main Effect')
        ax2.set_xticks(range(len(factor_b_means)))
        ax2.set_xticklabels(factor_b_means[self.factor_b])
        ax2.grid(True, alpha=0.3)
        if self.p_b < self.alpha:
            ax2.text(0.05, 0.95, f'p = {self.p_b:.4f}*', transform=ax2.transAxes, va='top', bbox=dict(boxstyle="round,pad=0.3", facecolor="lightgreen", alpha=0.7))

    def _plot_residual_qq(self, ax):
        residuals = self._calculate_residuals()
        if len(residuals) > 0:
            stats.probplot(residuals, dist="norm", plot=ax)
        ax.set_title('Q-Q Plot of Residuals')
        ax.grid(True, alpha=0.3)

def main():
    try:
        payload = json.load(sys.stdin)
        data = pd.DataFrame(payload.get('data'))
        dependent_var = payload.get('dependentVar')
        factor_a = payload.get('factorA')
        factor_b = payload.get('factorB')

        if not all([not data.empty, dependent_var, factor_a, factor_b]):
            raise ValueError("Missing data, dependentVar, factorA, or factorB")

        anova = TwoWayANOVA(data=data, dependent_var=dependent_var, factor_a=factor_a, factor_b=factor_b)
        anova.run_anova()
        assumptions = anova.test_assumptions()
        
        plot_image = anova.plot_results()

        response = {
            'results': {
                'anova_table': anova.results['anova_table'],
                'marginal_means': {
                    'factor_a': anova.results['marginal_means']['factor_a'],
                    'factor_b': anova.results['marginal_means']['factor_b'],
                },
                'assumptions': assumptions
            },
            'plot': plot_image
        }
        
        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()

    
