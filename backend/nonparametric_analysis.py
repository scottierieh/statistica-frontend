import sys
import json
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from scipy import stats
from scipy.stats import rankdata
from statsmodels.stats.contingency_tables import mcnemar
import warnings
from typing import Dict, List, Tuple, Optional, Union
import io
import base64

warnings.filterwarnings('ignore')

def _to_native_type(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
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
        U1 = statistic
        U2 = n1 * n2 - U1
        
        combined_data = np.concatenate([group1_data, group2_data])
        ranks = rankdata(combined_data)
        R1 = np.sum(ranks[:n1])
        R2 = np.sum(ranks[n1:])
        
        r = 1 - (2 * min(U1, U2)) / (n1 * n2) if n1 > 0 and n2 > 0 else 0
        
        desc_stats = {
            groups[0]: {'n': n1, 'median': np.median(group1_data), 'mean': np.mean(group1_data), 'std': np.std(group1_data, ddof=1)},
            groups[1]: {'n': n2, 'median': np.median(group2_data), 'mean': np.mean(group2_data), 'std': np.std(group2_data, ddof=1)}
        }
        
        is_significant = p_value < alpha
        effect_size_interp = self._interpret_effect_size(r, 'correlation')
        
        result = {
            'test_type': 'Mann-Whitney U Test', 'statistic': statistic, 'p_value': p_value,
            'U1': U1, 'U2': U2, 'R1': R1, 'R2': R2, 'n1': n1, 'n2': n2,
            'effect_size': r, 'effect_size_interpretation': effect_size_interp, 'alpha': alpha,
            'is_significant': is_significant, 'alternative': alternative, 'groups': groups,
            'descriptive_stats': desc_stats,
            'interpretation': self._interpret_mann_whitney(is_significant, groups, effect_size_interp, r, p_value, alpha),
            'group_col': group_col, 'value_col': value_col
        }
        self.results['mann_whitney'] = result
        return result

    def wilcoxon_signed_rank_test(self, var1: str, var2: str, alternative: str = 'two-sided', alpha: float = 0.05) -> Dict:
        data1 = self.data[var1].dropna()
        data2 = self.data[var2].dropna()
        valid_indices = data1.index.intersection(data2.index)
        data1 = data1.loc[valid_indices]
        data2 = data2.loc[valid_indices]

        if len(data1) == 0: raise ValueError("No valid paired observations found")
        
        differences = data1 - data2
        non_zero_diffs = differences[differences != 0]
        
        statistic, p_value = stats.wilcoxon(data1, data2, alternative=alternative, zero_method='pratt')
        
        abs_diffs = np.abs(non_zero_diffs)
        ranks = rankdata(abs_diffs)
        W_plus = np.sum(ranks[non_zero_diffs > 0])
        W_minus = np.sum(ranks[non_zero_diffs < 0])
        
        n_diff = len(non_zero_diffs)
        r = 1 - (2 * min(W_plus, W_minus)) / (n_diff * (n_diff + 1) / 2) if n_diff > 0 else 0
        
        desc_stats = {
            var1: {'n': len(data1), 'median': np.median(data1), 'mean': np.mean(data1), 'std': np.std(data1, ddof=1)},
            var2: {'n': len(data2), 'median': np.median(data2), 'mean': np.mean(data2), 'std': np.std(data2, ddof=1)}
        }
        
        is_significant = p_value < alpha
        effect_size_interp = self._interpret_effect_size(r, 'correlation')
        
        result = {
            'test_type': 'Wilcoxon Signed-Rank Test', 'statistic': statistic, 'p_value': p_value,
            'W_plus': W_plus, 'W_minus': W_minus, 'n_pairs': len(data1), 'effect_size': r,
            'effect_size_interpretation': effect_size_interp, 'alpha': alpha, 'is_significant': is_significant,
            'alternative': alternative, 'variables': [var1, var2], 'descriptive_stats': desc_stats,
            'interpretation': self._interpret_wilcoxon(is_significant, var1, var2, effect_size_interp, r, p_value, alpha, Wp, Wm)
        }
        self.results['wilcoxon'] = result
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
            'interpretation': self._interpret_kruskal_wallis(is_significant, self.data[group_col].unique(), effect_size_interp, epsilon_squared, p_value, alpha),
            'group_col': group_col, 'value_col': value_col
        }
        self.results['kruskal_wallis'] = result
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
            'interpretation': self._interpret_friedman(is_significant, variables, effect_size_interp, W, p_value, alpha),
            'variables': variables
        }
        self.results['friedman'] = result
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
            'interpretation': {
                'decision': f"{'Reject' if is_significant else 'Fail to reject'} H₀",
                'conclusion': interpretation
            }
        }
        self.results['mcnemar'] = result_dict
        return result_dict

    
    def _interpret_effect_size(self, r, type): return {'level': 'large', 'text': 'Large'} if abs(r) >= 0.5 else {'level': 'medium', 'text': 'Medium'} if abs(r) >= 0.3 else {'level': 'small', 'text': 'Small'} if abs(r) >= 0.1 else {'level': 'negligible', 'text': 'Negligible'}
    def _interpret_epsilon_squared(self, es): return {'level': 'large', 'text': 'Large'} if es >= 0.14 else {'level': 'medium', 'text': 'Medium'} if es >= 0.06 else {'level': 'small', 'text': 'Small'} if es >= 0.01 else {'level': 'negligible', 'text': 'Negligible'}
    def _interpret_kendall_w(self, w): return {'level': 'strong', 'text': 'Strong'} if w >= 0.3 else {'level': 'moderate', 'text': 'Moderate'} if w >= 0.1 else {'level': 'weak', 'text': 'Weak'}
    
    def _format_p_value(self, p): return "< 0.001" if p < 0.001 else f"{p:.3f}"
    
    def _interpret_mann_whitney(self, is_sig, groups, effect, r, p, alpha): return {'decision': f"{'Reject' if is_sig else 'Fail to reject'} H₀", 'conclusion': f"Significant difference {'found' if is_sig else 'not found'} between {groups[0]} and {groups[1]}", 'practical_significance': f"Effect size is {effect['text']} (r={r:.3f})"}
    def _interpret_wilcoxon(self, is_sig, v1, v2, effect, r, p, alpha, Wp, Wm): return {'decision': f"{'Reject' if is_sig else 'Fail to reject'} H₀", 'conclusion': f"Significant difference {'found' if is_sig else 'not found'} between {v1} and {v2}", 'practical_significance': f"Effect size is {effect['text']} (r={r:.3f})"}
    def _interpret_kruskal_wallis(self, is_sig, groups, effect, es, p, alpha): return {'decision': f"{'Reject' if is_sig else 'Fail to reject'} H₀", 'conclusion': f"Significant differences {'found' if is_sig else 'not found'} among groups", 'practical_significance': f"Effect size is {effect['text']} (ε²={es:.3f})"}
    def _interpret_friedman(self, is_sig, var, effect, W, p, alpha): return {'decision': f"{'Reject' if is_sig else 'Fail to reject'} H₀", 'conclusion': f"Significant differences {'found' if is_sig else 'not found'} across conditions", 'practical_significance': f"Concordance is {effect['text']} (W={W:.3f})"}

    def plot_results(self, test_type):
        if test_type not in self.results:
             raise ValueError(f"No results found for test type: {test_type}")
        result = self.results[test_type]
        
        if test_type == 'mcnemar':
            # McNemar doesn't have a standard plot like the others, so we create a heatmap for the contingency table
            table = pd.DataFrame(result['contingency_table'])
            fig, ax = plt.subplots(1, 1, figsize=(6, 5))
            sns.heatmap(table, annot=True, fmt='d', cmap='Blues', ax=ax)
            ax.set_title(f"Contingency Table for {result['test_type']}")
            ax.set_xlabel(table.columns.name)
            ax.set_ylabel(table.index.name)
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
                
                # This is a simplification; need to compute mean ranks properly
                mean_ranks_df = self.data.groupby(group_col)[value_col].apply(lambda x: x.rank().mean()).reset_index()
                sns.barplot(x=group_col, y=value_col, data=mean_ranks_df, ax=ax[1])
                ax[1].set_title('Mean Ranks')
                
            elif test_type == 'friedman':
                vars = result['variables']
                melted_data = self.data[vars].melt(var_name='Condition', value_name='Score')
                sns.boxplot(x='Condition', y='Score', data=melted_data, ax=ax[0])
                ax[0].set_title('Condition Distributions')
                
                # This is a simplification
                mean_ranks = [self.data[v].rank().mean() for v in vars]
                sns.barplot(x=vars, y=mean_ranks, ax=ax[1])
                ax[1].set_title('Mean Ranks')

            fig.suptitle(f"{result['test_type']} (p={self._format_p_value(result['p_value'])})")

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
        plot_image = None
        
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
        else:
            raise ValueError(f"Unknown test type: {test_type}")

        plot_image = tester.plot_results(test_type)
        
        response = { 'results': result, 'plot': plot_image }
        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()

    
