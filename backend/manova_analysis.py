import sys
import json
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from scipy import stats
from scipy.stats import f as f_dist, chi2
from sklearn.preprocessing import LabelEncoder
from statsmodels.multivariate.manova import MANOVA
from statsmodels.stats.multitest import multipletests
import itertools
from scipy.linalg import inv, det
import warnings
import io
import base64

warnings.filterwarnings('ignore')

# Set seaborn style globally
sns.set_theme(style="darkgrid")
sns.set_context("notebook", font_scale=1.1)

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

class MultivariateANOVA:
    def __init__(self, data, dependent_vars, factor_vars, alpha=0.05):
        self.data = data.copy()
        self.dependent_vars = dependent_vars
        self.factor_vars = factor_vars
        self.alpha = alpha
        self._prepare_data()
        self.results = {}

    def _prepare_data(self):
        all_vars = self.dependent_vars + self.factor_vars
        
        # Track original indices
        original_data = self.data[all_vars].copy()
        original_data['original_index'] = range(len(original_data))
        
        # Drop NA and track which rows were dropped
        self.clean_data = original_data.dropna().copy()
        dropped_indices = list(set(range(len(original_data))) - set(self.clean_data['original_index']))
        
        self.dropped_rows = sorted(dropped_indices)
        self.n_dropped = len(dropped_indices)
        
        # Remove the original_index column
        self.clean_data = self.clean_data.drop(columns=['original_index'])
        
        self.encoders = {}
        for factor in self.factor_vars:
            if self.clean_data[factor].dtype == 'object':
                encoder = LabelEncoder()
                self.clean_data[f'{factor}_encoded'] = encoder.fit_transform(self.clean_data[factor])
                self.encoders[factor] = encoder
        
        self.factor_levels = {factor: sorted(self.clean_data[factor].unique()) for factor in self.factor_vars}
        
        self.Y = self.clean_data[self.dependent_vars].values
        self.n = len(self.Y)
        self.p = len(self.dependent_vars)

    def one_way_manova(self, factor=None):
        if factor is None:
            factor = self.factor_vars[0]
        
        groups = self.factor_levels[factor]
        k = len(groups)
        if k < 2: raise ValueError("Need at least 2 groups for MANOVA")

        group_data = [self.Y[self.clean_data[factor] == group] for group in groups]
        group_sizes = np.array([len(d) for d in group_data])
        group_means = np.array([d.mean(axis=0) for d in group_data])
        overall_mean = self.Y.mean(axis=0)

        T = np.zeros((self.p, self.p))
        for i in range(self.n):
            dev = (self.Y[i] - overall_mean).reshape(-1, 1)
            T += dev @ dev.T
        
        H = np.zeros((self.p, self.p))
        for i, (group, n_group) in enumerate(zip(groups, group_sizes)):
            dev = (group_means[i] - overall_mean).reshape(-1, 1)
            H += n_group * (dev @ dev.T)
        
        E = T - H
        
        df_between = k - 1
        df_within = self.n - k

        test_stats = self._calculate_multivariate_test_statistics(H, E, df_between, df_within)
        
        eta_squared = np.nan
        try:
            eta_squared = 1 - (det(E) / det(T)) if det(T) != 0 else 0
        except np.linalg.LinAlgError:
            pass

        univariate_results = self._univariate_followup(factor, groups)
        posthoc_results = self._posthoc_tests(factor, groups) if any(test['p_value'] < self.alpha for test in test_stats.values()) else None

        # Generate interpretation
        temp_result = {
            'factor': factor, 
            'test_statistics': test_stats,
            'univariate_results': univariate_results,
            'significant': any(ts['p_value'] < self.alpha for ts in test_stats.values())
        }
        interpretation = self._generate_interpretation(temp_result)

        self.results['one_way'] = {
            'method': 'one_way_manova', 'factor': factor, 'groups': groups, 'n_groups': k,
            'test_statistics': test_stats, 'effect_size': eta_squared,
            'univariate_results': univariate_results, 'posthoc_results': posthoc_results,
            'significant': any(ts['p_value'] < self.alpha for ts in test_stats.values()),
            'interpretation': interpretation,
            'dropped_rows': self.dropped_rows,
            'n_dropped': self.n_dropped,
            'n_used': len(self.clean_data),
            'n_original': len(self.data)
        }
        return self.results['one_way']

    def _calculate_multivariate_test_statistics(self, H, E, df_hyp, df_error):
        try:
            E_inv_H = inv(E) @ H
            eigenvals = np.real(np.linalg.eigvals(E_inv_H))
            eigenvals = eigenvals[eigenvals > 1e-10]
        except np.linalg.LinAlgError:
            eigenvals = np.array([])
        
        s = min(self.p, df_hyp)
        m = (abs(self.p - df_hyp) - 1) / 2
        n_prime = (df_error - self.p - 1) / 2

        stats_dict = {}

        # Pillai's Trace
        V = np.sum(eigenvals / (1 + eigenvals)) if len(eigenvals) > 0 else 0
        F_pillai = (2 * n_prime + s + 1) / (2 * m + s + 1) * V / (s - V) if (s-V) > 0 else np.inf
        df1_pillai = s * (2 * m + s + 1)
        df2_pillai = s * (2 * n_prime + s + 1)
        p_pillai = 1 - f_dist.cdf(F_pillai, df1_pillai, df2_pillai) if df1_pillai > 0 and df2_pillai > 0 else 1.0
        stats_dict['pillai'] = {'statistic': V, 'F': F_pillai, 'df1': df1_pillai, 'df2': df2_pillai, 'p_value': p_pillai}

        # Wilks' Lambda
        L = np.prod(1 / (1 + eigenvals)) if len(eigenvals) > 0 else 1.0
        w = df_error - 0.5 * (self.p - df_hyp + 1)
        t = np.sqrt((self.p**2 * df_hyp**2 - 4) / (self.p**2 + df_hyp**2 - 5)) if (self.p**2 + df_hyp**2 - 5) > 0 else 1
        df1_wilks = self.p * df_hyp
        df2_wilks = w * t - 0.5 * (self.p * df_hyp - 2)
        F_wilks = ((1 - L**(1/t)) / (L**(1/t))) * (df2_wilks / df1_wilks) if L > 0 else np.inf
        p_wilks = 1 - f_dist.cdf(F_wilks, df1_wilks, df2_wilks) if df1_wilks > 0 and df2_wilks > 0 else 1.0
        stats_dict['wilks'] = {'statistic': L, 'F': F_wilks, 'df1': df1_wilks, 'df2': df2_wilks, 'p_value': p_wilks}

        # Hotelling-Lawley Trace
        T_hl = np.sum(eigenvals)
        F_hotelling = T_hl * (2 * n_prime + s + 1) / (s * (2 * m + s + 1))
        p_hotelling = 1- f_dist.cdf(F_hotelling, df1_pillai, df2_pillai) if df1_pillai > 0 and df2_pillai > 0 else 1.0
        stats_dict['hotelling'] = {'statistic': T_hl, 'F': F_hotelling, 'df1': df1_pillai, 'df2': df2_pillai, 'p_value': p_hotelling}

        # Roy's Greatest Root
        theta = np.max(eigenvals) if len(eigenvals) > 0 else 0
        s_roy = max(self.p, df_hyp)
        F_roy = theta * (df_error - s_roy + df_hyp) / s_roy
        df1_roy = s_roy
        df2_roy = df_error - s_roy + df_hyp
        p_roy = 1 - f_dist.cdf(F_roy, df1_roy, df2_roy) if df1_roy > 0 and df2_roy > 0 else 1.0
        stats_dict['roy'] = {'statistic': theta, 'F': F_roy, 'df1': df1_roy, 'df2': df2_roy, 'p_value': p_roy}
        
        return stats_dict

    def _univariate_followup(self, factor, groups):
        results = {}
        for i, dv in enumerate(self.dependent_vars):
            group_data = [self.clean_data[self.clean_data[factor] == group][dv] for group in groups]
            f_stat, p_val = stats.f_oneway(*group_data)
            
            ss_between = sum(len(g) * (np.mean(g) - self.clean_data[dv].mean())**2 for g in group_data)
            ss_total = np.sum((self.clean_data[dv] - self.clean_data[dv].mean())**2)
            eta_sq = ss_between / ss_total if ss_total > 0 else 0
            
            results[dv] = {'f_statistic': f_stat, 'p_value': p_val, 'eta_squared': eta_sq, 'significant': p_val < self.alpha}
        return results

    def _posthoc_tests(self, factor, groups):
        results = {}
        for dv in self.dependent_vars:
            pairwise = []
            for group1, group2 in itertools.combinations(groups, 2):
                data1 = self.clean_data[self.clean_data[factor] == group1][dv]
                data2 = self.clean_data[self.clean_data[factor] == group2][dv]
                t_stat, p_val = stats.ttest_ind(data1, data2)
                
                pooled_std = np.sqrt(((len(data1)-1)*np.var(data1, ddof=1) + (len(data2)-1)*np.var(data2, ddof=1)) / (len(data1) + len(data2) - 2))
                cohens_d = (np.mean(data1) - np.mean(data2)) / pooled_std if pooled_std > 0 else 0
                
                pairwise.append({'group1': group1, 'group2': group2, 't_statistic': t_stat, 'p_value': p_val, 'cohens_d': cohens_d, 'mean_diff': np.mean(data1) - np.mean(data2)})
            
            if pairwise:
                p_vals = [test['p_value'] for test in pairwise]
                corrected_p = multipletests(p_vals, method='bonferroni')[1]
                for test, p_corr in zip(pairwise, corrected_p):
                    test['p_corrected'] = p_corr
                    test['significant_corrected'] = p_corr < self.alpha
            results[dv] = pairwise
        return results

    def _generate_interpretation(self, result):
        """Generate detailed interpretation of MANOVA results"""
        interpretation_parts = []
        
        # Section 1: Overall Analysis
        interpretation_parts.append("**Overall Analysis**")
        
        pillai = result['test_statistics']['pillai']
        
        # Significance statement
        if pillai['p_value'] < 0.001:
            sig_statement = "highly significant"
        elif pillai['p_value'] < 0.01:
            sig_statement = "very significant"
        elif pillai['p_value'] < 0.05:
            sig_statement = "significant"
        else:
            sig_statement = "not significant"
        
        # Effect size interpretation
        if pillai['statistic'] >= 0.5:
            effect_desc = "large"
        elif pillai['statistic'] >= 0.3:
            effect_desc = "medium"
        elif pillai['statistic'] >= 0.1:
            effect_desc = "small"
        else:
            effect_desc = "negligible"
        
        # Check if all tests agree
        all_significant = all(test['p_value'] < self.alpha for test in result['test_statistics'].values())
        
        # Main overall statement
        if result['significant']:
            p_value_str = '< .001' if pillai['p_value'] < 0.001 else f"= {pillai['p_value']:.3f}"
            interpretation_parts.append(
                f"The MANOVA reveals a {sig_statement} multivariate effect of '{result['factor']}' on the combined set of "
                f"{len(self.dependent_vars)} dependent variables (Pillai's Trace = {pillai['statistic']:.3f}, "
                f"F({pillai['df1']:.0f}, {pillai['df2']:.0f}) = {pillai['F']:.2f}, p {p_value_str}). "
                f"This represents a {effect_desc} effect size, indicating that groups differ meaningfully in their multivariate profile. "
            )
            
            if all_significant:
                interpretation_parts.append(
                    "All four multivariate test statistics (Pillai's, Wilks', Hotelling's, and Roy's) converge on the same conclusion, "
                    "providing robust evidence for the group differences."
                )
            else:
                interpretation_parts.append(
                    "While Pillai's Trace (the most robust statistic) indicates significance, not all multivariate tests agree. "
                    "Pillai's Trace is recommended for interpretation, especially with unequal sample sizes or violated assumptions."
                )
        else:
            p_value_str = f"{pillai['p_value']:.3f}"
            interpretation_parts.append(
                f"The MANOVA does not detect a significant multivariate effect of '{result['factor']}' on the combined dependent variables "
                f"(Pillai's Trace = {pillai['statistic']:.3f}, F({pillai['df1']:.0f}, {pillai['df2']:.0f}) = {pillai['F']:.2f}, "
                f"p = {p_value_str}). Groups appear similar in their overall multivariate profiles."
            )
        
        interpretation_parts.append("")
        
        # Section 2: Statistical Insights
        interpretation_parts.append("**Statistical Insights**")
        
        univariate = result['univariate_results']
        significant_dvs = [dv for dv, res in univariate.items() if res['significant']]
        non_sig_dvs = [dv for dv, res in univariate.items() if not res['significant']]
        
        if result['significant']:
            if significant_dvs:
                interpretation_parts.append(
                    f"Univariate follow-up tests identify which specific variables drive the multivariate effect. "
                    f"Of the {len(self.dependent_vars)} dependent variables, {len(significant_dvs)} show significant group differences:"
                )
                
                for dv in significant_dvs:
                    res = univariate[dv]
                    if res['eta_squared'] >= 0.14:
                        eta_desc = "large"
                    elif res['eta_squared'] >= 0.06:
                        eta_desc = "medium"
                    elif res['eta_squared'] >= 0.01:
                        eta_desc = "small"
                    else:
                        eta_desc = "negligible"
                    
                    p_str = "< .001" if res['p_value'] < 0.001 else f"= {res['p_value']:.3f}"
                    eta_str = f"{res['eta_squared']:.3f}"
                    f_str = f"{res['f_statistic']:.2f}"
                    interpretation_parts.append(
                        f"→ {dv}: F = {f_str}, p {p_str}, η² = {eta_str} ({eta_desc} effect size)"
                    )
                
                if non_sig_dvs:
                    interpretation_parts.append("")
                    interpretation_parts.append(
                        f"The remaining variables ({', '.join(non_sig_dvs)}) do not show significant univariate differences, "
                        f"though they may still contribute to the overall multivariate pattern through correlations with significant variables."
                    )
            else:
                interpretation_parts.append(
                    "Interestingly, while the multivariate test is significant, none of the individual dependent variables "
                    "reach significance in univariate tests. This pattern suggests that the group differences emerge from "
                    "the combined, correlated pattern across variables rather than strong effects on any single variable. "
                    "This demonstrates the unique value of MANOVA in detecting subtle multivariate effects that would be missed "
                    "by separate univariate analyses."
                )
        else:
            interpretation_parts.append(
                "Univariate follow-up tests confirm the lack of multivariate effect:"
            )
            for dv in self.dependent_vars:
                res = univariate[dv]
                p_str = "< .001" if res['p_value'] < 0.001 else f"= {res['p_value']:.3f}"
                sig_str = 'significant' if res['significant'] else 'not significant'
                f_str = f"{res['f_statistic']:.2f}"
                interpretation_parts.append(
                    f"→ {dv}: F = {f_str}, p {p_str} ({sig_str})"
                )
        
        interpretation_parts.append("")
        
        # Section 3: Recommendations
        interpretation_parts.append("**Recommendations**")
        
        if result['significant']:
            if significant_dvs:
                interpretation_parts.append(
                    "• Conduct post-hoc pairwise comparisons to determine which specific groups differ from each other"
                )
                interpretation_parts.append(
                    f"• Focus follow-up analyses on significant variables: {', '.join(significant_dvs)}"
                )
                interpretation_parts.append(
                    "• Verify MANOVA assumptions including multivariate normality and homogeneity of covariance matrices (Box's M test)"
                )
                interpretation_parts.append(
                    "• Consider the practical significance: examine whether effect sizes represent meaningful real-world differences"
                )
                interpretation_parts.append(
                    "• Visualize group differences on significant variables to aid interpretation and communication"
                )
                interpretation_parts.append(
                    "• If groups are ordered, consider trend analysis to understand patterns"
                )
            else:
                interpretation_parts.append(
                    "• Examine the correlation structure among dependent variables to understand how they combine to produce the effect"
                )
                interpretation_parts.append(
                    "• Consider discriminant analysis to identify the linear combination of variables that best separates groups"
                )
                interpretation_parts.append(
                    "• Verify assumptions thoroughly, as this pattern can sometimes indicate assumption violations"
                )
                interpretation_parts.append(
                    "• Visualize the multivariate space (e.g., using canonical variates) to see group separation"
                )
                interpretation_parts.append(
                    "• Interpret results cautiously and consider replication with independent data"
                )
        else:
            interpretation_parts.append(
                "• Verify that sample size is adequate—MANOVA requires more cases per group than the number of DVs"
            )
            interpretation_parts.append(
                "• Check that measurement of variables is reliable and valid (measurement error reduces power)"
            )
            interpretation_parts.append(
                f"• Consider whether '{result['factor']}' is the appropriate grouping variable for your research question"
            )
            interpretation_parts.append(
                "• Examine whether the dependent variables are truly relevant to expected group differences"
            )
            interpretation_parts.append(
                "• Review assumption checks: violations can reduce power to detect effects"
            )
            interpretation_parts.append(
                "• If theory predicts group differences, consider this preliminary and plan replication with larger samples"
            )
        
        return "\n".join(interpretation_parts)

    def plot_results(self, result):
        fig, axes = plt.subplots(2, 2, figsize=(15, 12))

        factor, groups = result['factor'], result['groups']
        colors = sns.color_palette('crest', n_colors=len(groups))
        
        # 1. Group means plot
        group_means = np.array([self.clean_data[self.clean_data[factor] == g][self.dependent_vars].mean() for g in groups])
        x = np.arange(len(self.dependent_vars))
        width = 0.8 / len(groups)
        
        for i, group in enumerate(groups):
            offset = (i - len(groups)/2 + 0.5) * width
            axes[0, 0].bar(x + offset, group_means[i], width, label=group, color=colors[i], alpha=0.8)
        
        axes[0, 0].set_xticks(x)
        axes[0, 0].set_xticklabels(self.dependent_vars, rotation=45, ha='right')
        axes[0, 0].set_title('Group Means on Dependent Variables', fontsize=12, fontweight='bold')
        axes[0, 0].set_ylabel('Mean Value', fontsize=12)
        axes[0, 0].legend()

        # 2. Box plots for first two DVs
        dvs_to_plot = self.dependent_vars[:2]
        for i, dv in enumerate(dvs_to_plot):
            ax = axes[0, 1] if i == 0 else axes[1, 0]
            sns.boxplot(x=factor, y=dv, data=self.clean_data, ax=ax, palette=colors)
            ax.set_title(f'Distribution of {dv}', fontsize=12, fontweight='bold')
            ax.set_xlabel(factor, fontsize=12)
            ax.set_ylabel(dv, fontsize=12)

        # 3. p-values of multivariate tests
        test_names = list(result['test_statistics'].keys())
        p_values = [res['p_value'] for res in result['test_statistics'].values()]
        bars = axes[1, 1].bar(test_names, p_values, color='#5B9BD5')
        axes[1, 1].axhline(y=self.alpha, color='r', linestyle='--', label=f'alpha={self.alpha}')
        axes[1, 1].set_title('Multivariate Test p-values', fontsize=12, fontweight='bold')
        axes[1, 1].set_xlabel('Test', fontsize=12)
        axes[1, 1].set_ylabel('p-value', fontsize=12)
        axes[1, 1].legend()

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
        dependent_vars = payload.get('dependentVars')
        factor_vars = payload.get('factorVars')

        if not all([not data.empty, dependent_vars, factor_vars]):
            raise ValueError("Missing data, dependentVars, or factorVars")

        manova = MultivariateANOVA(data, dependent_vars, factor_vars)
        result = manova.one_way_manova()
        plot_image = manova.plot_results(result)

        response = {'results': result, 'plot': plot_image}
        print(json.dumps(response, default=_to_native_type, indent=2))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()

    