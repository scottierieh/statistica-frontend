

import sys
import json
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from scipy import stats
from scipy.stats import rankdata
from statsmodels.stats.contingency_tables import mcnemar
import pingouin as pg
import warnings
from typing import Dict, List, Tuple, Optional, Union
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

class NonParametricTests:
    def __init__(self, data: pd.DataFrame):
        self.data = data
        self.results = {}
        
    def rm_anova(self, dv: str, within: str, subject: str, between: Optional[str] = None, alpha: float = 0.05) -> Dict:
        """
        Performs a repeated measures ANOVA.
        `data` should be in long format.
        """
        aov = pg.rm_anova(data=self.data, dv=dv, within=within, subject=subject, between=between, detailed=True, effsize="np2")

        # Perform sphericity test if applicable
        sphericity_test_res = None
        if self.data[within].nunique() > 2:
            sphericity_test = pg.sphericity(data=self.data, dv=dv, within=within, subject=subject)
            if isinstance(sphericity_test, tuple): # older pingouin
                 sphericity_test_res = {'spher': sphericity_test[0], 'p-val': sphericity_test[2], 'W': sphericity_test[1]}
            else: # newer pingouin
                 sphericity_test_res = sphericity_test.to_dict('records')[0]


        # Perform post-hoc tests if there's a significant effect
        posthoc_res = None
        main_effect_p = aov.loc[aov['Source'] == within, 'p-GG-corr'].iloc[0] if 'p-GG-corr' in aov.columns else aov.loc[aov['Source'] == within, 'p-unc'].iloc[0]
        if main_effect_p < alpha:
            posthoc_res = pg.pairwise_tests(data=self.data, dv=dv, within=within, subject=subject, between=between, padjust='bonf').to_dict('records')

        return {
            'test_type': 'Repeated Measures ANOVA',
            'anova_table': aov.to_dict('records'),
            'sphericity': sphericity_test_res,
            'posthoc': posthoc_res
        }


    def mann_whitney_u_test(self, group_col: str, value_col: str, groups: List[str] = None, alternative: str = 'two-sided', alpha: float = 0.05) -> Dict:
        if groups is None:
            unique_groups = self.data[group_col].unique()
            if len(unique_groups) != 2:
                raise ValueError(f"Found {len(unique_groups)} groups, need exactly 2 for Mann-Whitney U test")
            groups = unique_groups.tolist()
        
        group1_data = self.data[self.data[group_col] == groups[0]][value_col].dropna()
        group2_data = self.data[self.data[group_col] == groups[1]][value_col].dropna()
        
        if len(group1_data) == 0 or len(group2_data) == 0:
            raise ValueError("One or both groups have no data.")

        statistic, p_value = stats.mannwhitneyu(group1_data, group2_data, alternative=alternative)
        
        n1, n2 = len(group1_data), len(group2_data)
        
        combined_data = np.concatenate([group1_data, group2_data])
        ranks = rankdata(combined_data)
        R1 = np.sum(ranks[:n1])
        R2 = np.sum(ranks[n1:])
        
        U1 = R1 - n1 * (n1 + 1) / 2
        U2 = R2 - n2 * (n2 + 1) / 2
        U_stat = min(U1, U2)
        
        # Calculate effect size r
        mean_u = n1 * n2 / 2
        std_u = np.sqrt(n1 * n2 * (n1 + n2 + 1) / 12) if (n1+n2) > 0 else 0
        z_score = (U_stat - mean_u) / std_u if std_u > 0 else 0
        r = abs(z_score) / np.sqrt(n1 + n2) if (n1 + n2) > 0 else 0
        
        desc_stats = {
            groups[0]: {'n': n1, 'median': np.median(group1_data), 'mean_rank': R1 / n1 if n1 > 0 else 0},
            groups[1]: {'n': n2, 'median': np.median(group2_data), 'mean_rank': R2 / n2 if n2 > 0 else 0}
        }
        
        is_significant = p_value < alpha
        effect_size_interp = self._interpret_effect_size(r, 'correlation')
        
        result = {
            'test_type': 'Mann-Whitney U Test', 'statistic': statistic, 'p_value': p_value,
            'U': U_stat, 'R1': R1, 'R2': R2, 'n1': n1, 'n2': n2,
            'z_score': z_score,
            'effect_size': r, 'effect_size_interpretation': effect_size_interp, 'alpha': alpha,
            'is_significant': is_significant, 'alternative': alternative, 'groups': groups,
            'descriptive_stats': desc_stats,
            'interpretation': self._interpret_mann_whitney(is_significant, groups, p_value, group_col, value_col, desc_stats, z_score),
            'group_col': group_col, 'value_col': value_col
        }
        return result

    def wilcoxon_signed_rank_test(self, var1: str, var2: str, alternative: str = 'two-sided', alpha: float = 0.05) -> Dict:
        clean_data = self.data[[var1, var2]].dropna()
        if len(clean_data) < 10:
             raise ValueError("Wilcoxon test requires at least 10 complete pairs.")
        
        data1 = clean_data[var1]
        data2 = clean_data[var2]

        if len(data1) == 0: raise ValueError("No valid paired observations found")
        
        differences = data1 - data2
        non_zero_diffs = differences[differences != 0]
        
        statistic, p_value = stats.wilcoxon(data1, data2, alternative=alternative, zero_method='pratt')
        
        abs_diffs = np.abs(non_zero_diffs)
        ranks = rankdata(abs_diffs)
        W_plus = np.sum(ranks[non_zero_diffs > 0])
        W_minus = np.sum(ranks[non_zero_diffs < 0])
        
        n_diff = len(non_zero_diffs)
        mean_W = n_diff * (n_diff + 1) / 4
        std_W = np.sqrt(n_diff * (n_diff + 1) * (2 * n_diff + 1) / 24)
        z_score = (statistic - mean_W) / std_W if std_W > 0 else 0

        r = z_score / np.sqrt(n_diff) if n_diff > 0 else 0
        
        desc_stats = {
            var1: {'n': len(data1), 'median': np.median(data1), 'mean': np.mean(data1), 'std': np.std(data1, ddof=1)},
            var2: {'n': len(data2), 'median': np.median(data2), 'mean': np.mean(data2), 'std': np.std(data2, ddof=1)}
        }
        
        is_significant = p_value < alpha
        effect_size_interp = self._interpret_effect_size(r, 'correlation')
        
        result = {
            'test_type': 'Wilcoxon Signed-Rank Test', 'statistic': statistic, 'p_value': p_value, 'z_score': z_score,
            'W_plus': W_plus, 'W_minus': W_minus, 'n_pairs': len(data1), 'effect_size': r,
            'effect_size_interpretation': effect_size_interp, 'alpha': alpha, 'is_significant': is_significant,
            'alternative': alternative, 'variables': [var1, var2], 'descriptive_stats': desc_stats,
            'interpretation': self._interpret_wilcoxon(is_significant, var1, var2, p_value, z_score, desc_stats)
        }
        
        return result

    def kruskal_wallis_test(self, group_col: str, value_col: str, alpha: float = 0.05) -> Dict:
        groups_data = [self.data[self.data[group_col] == name][value_col].dropna() for name in self.data[group_col].unique()]
        if len(groups_data) < 3: raise ValueError("Kruskal-Wallis test requires at least 3 groups")

        statistic, p_value = stats.kruskal(*groups_data)
        
        n_total = sum(len(g) for g in groups_data)
        k = len(groups_data)
        df = k - 1
        
        epsilon_squared = (statistic - k + 1) / (n_total - k) if (n_total -k) > 0 else 0
        
        is_significant = p_value < alpha
        effect_size_interp = self._interpret_epsilon_squared(epsilon_squared)
        
        result = {
            'test_type': 'Kruskal-Wallis H Test', 'statistic': statistic, 'p_value': p_value, 'df': df,
            'n_groups': k, 'n_total': n_total, 'effect_size': epsilon_squared,
            'effect_size_interpretation': effect_size_interp, 'alpha': alpha, 'is_significant': is_significant,
            'interpretation': self._interpret_kruskal_wallis(is_significant, self.data[group_col].unique(), effect_size_interp, epsilon_squared, p_value, alpha, statistic, df),
            'group_col': group_col, 'value_col': value_col
        }
        return result

    def friedman_test(self, variables: List[str], alpha: float = 0.05) -> Dict:
        if len(variables) < 3: raise ValueError("Friedman test requires at least 3 variables")
        
        data_matrix = self.data[variables].dropna().values
        if data_matrix.shape[0] == 0: raise ValueError("No complete observations found")

        statistic, p_value = stats.friedmanchisquare(*[data_matrix[:, i] for i in range(len(variables))])
        
        n_subjects, k_conditions = data_matrix.shape
        df = k_conditions - 1
        W = statistic / (n_subjects * (k_conditions - 1)) if n_subjects > 0 and k_conditions > 1 else 0
        
        is_significant = p_value < alpha
        effect_size_interp = self._interpret_kendall_w(W)

        result = {
            'test_type': 'Friedman Test', 'statistic': statistic, 'p_value': p_value, 'df': df,
            'n_subjects': n_subjects, 'k_conditions': k_conditions, 'effect_size': W,
            'effect_size_interpretation': effect_size_interp, 'alpha': alpha, 'is_significant': is_significant,
            'interpretation': self._interpret_friedman(is_significant, variables, effect_size_interp, W, p_value, alpha, statistic, df),
            'variables': variables
        }
        return result
        
    def mcnemar_test(self, var1: str, var2: str, alpha: float = 0.05) -> Dict:
        clean_data = self.data[[var1, var2]].dropna()
        if len(clean_data) < 10:
            raise ValueError("Not enough paired data for McNemar's test (minimum 10 pairs required).")
            
        contingency_table = pd.crosstab(clean_data[var1], clean_data[var2])
        
        # Ensure it's a 2x2 table
        if contingency_table.shape != (2, 2):
            raise ValueError("McNemar's test requires a 2x2 contingency table. Ensure both variables are binary.")
            
        result = mcnemar(contingency_table, exact=True) # Use exact test for small samples
        
        statistic = result.statistic
        p_value = result.pvalue
        
        is_significant = p_value < alpha
        
        interpretation = (
            f"The result is {'statistically significant' if is_significant else 'not statistically significant'} (p={p_value:.4f}). "
            f"This suggests that there is a {'significant change' if is_significant else 'no significant change'} in the proportion of outcomes between '{var1}' and '{var2}'."
        )

        result_dict = {
            'test_type': "McNemar's Test",
            'statistic': statistic,
            'p_value': p_value,
            'contingency_table': contingency_table.to_dict(),
            'is_significant': is_significant,
            'interpretation': interpretation
        }
        return result_dict

    
    def _interpret_effect_size(self, r, type): return {'level': 'large', 'text': 'Large'} if abs(r) >= 0.5 else {'level': 'medium', 'text': 'Medium'} if abs(r) >= 0.3 else {'level': 'small', 'text': 'Small'} if abs(r) >= 0.1 else {'level': 'negligible', 'text': 'Negligible'}
    def _interpret_epsilon_squared(self, es):
        level = 'Large' if es >= 0.14 else 'Medium' if es >= 0.06 else 'Small' if es >= 0.01 else 'Negligible'
        return {'level': level.lower(), 'text': level}
    def _interpret_kendall_w(self, w):
        level = 'Strong' if w >= 0.3 else 'Moderate' if w >= 0.1 else 'Weak'
        return {'level': level.lower(), 'text': level}
    
    def _format_p_value(self, p, alpha): 
        return f"p < {alpha}" if p < alpha else f"p = {p:.3f}"
    
    def _interpret_mann_whitney(self, is_sig, groups, p, group_col, value_col, desc_stats, z_score):
        p_text = self._format_p_value(p, 0.05).replace('=', 'p =')

        g1_name, g2_name = groups[0], groups[1]
        g1_rank, g2_rank = desc_stats[g1_name]['mean_rank'], desc_stats[g2_name]['mean_rank']

        higher_group = g1_name if g1_rank > g2_rank else g2_name
        lower_group = g2_name if g1_rank > g2_rank else g1_name

        sig_text = "was a significant difference" if is_sig else "was no significant difference"
        
        interp = (
            f"A Mann-Whitney U test was conducted to determine whether there was a difference in '{value_col}' between the '{g1_name}' and '{g2_name}' groups.\n"
            f"Results of that analysis indicated that there {sig_text}, z = {z_score:.2f}, {p_text}.\n"
        )

        if is_sig:
            interp += f"The results indicate that the '{higher_group}' group had a significantly higher mean rank on '{value_col}' than the '{lower_group}' group."

        return interp.strip()

    def _interpret_wilcoxon(self, is_sig, v1, v2, p, z_score, desc_stats):
        p_text = self._format_p_value(p, 0.05).replace('=', 'p =')
        
        med1 = desc_stats[v1]['median']
        med2 = desc_stats[v2]['median']

        preferred_var = f"'{v1}'" if med1 > med2 else f"'{v2}'"
        other_var = f"'{v2}'" if med1 > med2 else f"'{v1}'"

        sig_text = "was a significant difference" if is_sig else "was no significant difference"
        
        interp = (
            f"A Wilcoxon Signed-Rank test was conducted to determine if there was a difference in the ranking of '{v1}' and '{v2}'.\n"
            f"Results of that analysis indicated that there {sig_text}, z = {z_score:.2f}, {p_text}.\n"
        )

        if is_sig:
            interp += f"The results indicate that {preferred_var} was the preferred option and received significantly more favorable rankings than {other_var}."

        return interp.strip()
        
    def _interpret_kruskal_wallis(self, is_sig, groups, effect_size_interp, es, p, alpha, h_stat, df):
        p_text = self._format_p_value(p, alpha)
        
        conclusion = f"A Kruskal-Wallis H test showed that there was a {'statistically significant' if is_sig else 'not statistically significant'} difference in scores between the different groups, H({df}) = {h_stat:.2f}, {p_text}."
        practical_significance = f"The magnitude of the differences between the groups was {effect_size_interp['level']} (ε²={es:.3f})."
        
        return f"{conclusion}\n{practical_significance}"

    def _interpret_friedman(self, is_sig, var, effect_size_interp, W, p, alpha, stat, df):
        p_text = self._format_p_value(p, alpha)
        
        conclusion = f"A Friedman test revealed a {'statistically significant' if is_sig else 'not statistically significant'} difference in scores across the conditions, χ²({df}) = {stat:.2f}, {p_text}."
        practical_significance = f"The level of concordance among the ranks was {effect_size_interp['level']} (Kendall's W = {W:.3f})."

        return f"{conclusion}\n{practical_significance}"

    def plot_results(self, test_type):
        result = self.results.get(test_type)
        if not result:
            # Check if it's nested
            if self.results and self.results.get('results'):
                result = self.results.get('results')
            else:
                 raise ValueError(f"No results found for test type: {test_type}")
        
        if test_type == 'mcnemar':
            table = pd.DataFrame(result['contingency_table'])
            fig, ax = plt.subplots(1, 1, figsize=(6, 5))
            sns.heatmap(table, annot=True, fmt='d', cmap='Blues', ax=ax)
            ax.set_title(f"Contingency Table for {result['test_type']}")
            ax.set_xlabel(table.columns.name)
            ax.set_ylabel(table.index.name)
        elif test_type == 'rm_anova':
            # Specific plot for repeated measures ANOVA
            fig, ax = plt.subplots(figsize=(8, 6))
            sns.pointplot(data=self.data, x=result['anova_table'][0]['Source'], y=result['anova_table'][0]['dv'], hue=result['anova_table'][0].get('between'), ax=ax, dodge=True, errorbar='ci')
            ax.set_title(f"Interaction Plot for Repeated Measures ANOVA")
            ax.set_xlabel("Within-Subject Factor")
            ax.set_ylabel(f"Mean of {result['anova_table'][0]['dv']}")
            ax.legend(title=result['anova_table'][0].get('between'))
            ax.grid(True, linestyle='--', alpha=0.6)
        else:
            fig, ax = plt.subplots(1, 2, figsize=(12, 5))
            sns.set_style("whitegrid")
            
            if test_type == 'mann_whitney':
                groups = result['groups']
                group_col = result['group_col']
                value_col = result['value_col']
                data_to_plot = [self.data[self.data[group_col] == g][value_col] for g in groups]
                
                sns.boxplot(data=data_to_plot, ax=ax[0])
                ax[0].set_xticklabels(groups)
                ax[0].set_title('Group Distributions')
                
                mean_ranks = [result['R1']/result['n1'], result['R2']/result['n2']]
                sns.barplot(x=groups, y=mean_ranks, ax=ax[1])
                ax[1].set_title('Mean Ranks')

            elif test_type == 'wilcoxon':
                vars = result['variables']
                sns.boxplot(data=self.data[vars], ax=ax[0])
                ax[0].set_title('Paired Variables Distribution')
                
                sns.histplot(self.data[vars[0]] - self.data[vars[1]], ax=ax[1], kde=True)
                ax[1].set_title('Distribution of Differences')
            
            elif test_type == 'kruskal_wallis':
                group_col = result['group_col']
                value_col = result['value_col']
                sns.boxplot(x=group_col, y=value_col, data=self.data, ax=ax[0])
                ax[0].set_title('Group Distributions')
                
                mean_ranks_df = self.data.groupby(group_col)[value_col].apply(lambda x: x.rank().mean()).reset_index()
                sns.barplot(x=group_col, y=value_col, data=mean_ranks_df, ax=ax[1])
                ax[1].set_title('Mean Ranks')
                
            elif test_type == 'friedman':
                vars = result['variables']
                melted_data = self.data[vars].melt(var_name='Condition', value_name='Score')
                sns.boxplot(x='Condition', y='Score', data=melted_data, ax=ax[0])
                ax[0].set_title('Condition Distributions')
                
                mean_ranks = [self.data[v].rank().mean() for v in vars]
                sns.barplot(x=vars, y=mean_ranks, ax=ax[1])
                ax[1].set_title('Mean Ranks')

            fig.suptitle(f"{result['test_type']} (p={self._format_p_value(result['p_value'], result['alpha'])})")

        plt.tight_layout(rect=[0, 0, 1, 0.96])
        
        buf = io.BytesIO()
        plt.savefig(buf, format='png')
        plt.close(fig)
        buf.seek(0)
        image_base64 = base64.b64encode(buf.read()).decode('utf-8')
        return f"data:image/png;base64,{image_base64}"

def main():
    try:
        payload = json.load(sys.stdin)
        data = pd.DataFrame(payload.get('data'))
        test_type = payload.get('testType')
        params = payload.get('params')

        if data.empty or not test_type or not params:
            raise ValueError("Missing data, testType, or params")

        tester = NonParametricTests(data)
        result = {}
        
        if test_type == 'mann_whitney':
            result = tester.mann_whitney_u_test(**params)
        elif test_type == 'wilcoxon':
            result = tester.wilcoxon_signed_rank_test(**params)
        elif test_type == 'kruskal_wallis':
            result = tester.kruskal_wallis_test(**params)
        elif test_type == 'friedman':
            result = tester.friedman_test(**params)
        elif test_type == 'mcnemar':
            result = tester.mcnemar_test(**params)
        elif test_type == 'rm_anova':
            result = tester.rm_anova(**params)
        else:
            raise ValueError(f"Unknown test type: {test_type}")
        
        tester.results[test_type] = result
        plot_image = tester.plot_results(test_type)
        
        response = { 'results': result, 'plot': plot_image }
        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()

    
    

    
