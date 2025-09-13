import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from scipy import stats
from itertools import combinations
import warnings
warnings.filterwarnings('ignore')

class OneWayANOVA:
    """
    One-Way ANOVA Analysis Class
    Performs complete ANOVA with post-hoc tests and assumption checking
    """
    
    def __init__(self, data=None, groups=None, values=None, group_col=None, value_col=None):
        """
        Initialize One-Way ANOVA
        
        Parameters:
        -----------
        data : pandas.DataFrame
            Data containing groups and values
        groups : list
            Group labels (if providing separate arrays)
        values : list
            Values for each group (if providing separate arrays)
        group_col : str
            Column name for groups (if using DataFrame)
        value_col : str
            Column name for values (if using DataFrame)
        """
        
        if data is not None and group_col is not None and value_col is not None:
            # DataFrame input
            self.data = data.copy()
            self.group_col = group_col
            self.value_col = value_col
            self._prepare_data_from_df()
        elif groups is not None and values is not None:
            # List input
            self._prepare_data_from_lists(groups, values)
        else:
            raise ValueError("Must provide either (data, group_col, value_col) or (groups, values)")
        
        self.results = {}
        
    def _prepare_data_from_df(self):
        """Prepare data from DataFrame"""
        # Remove missing values
        self.clean_data = self.data[[self.group_col, self.value_col]].dropna()
        
        # Extract groups and values
        self.group_labels = self.clean_data[self.group_col].values
        self.values = self.clean_data[self.value_col].values
        
        # Get unique groups
        self.groups = sorted(self.clean_data[self.group_col].unique())
        self.k = len(self.groups)
        
        # Organize data by groups
        self.group_data = {}
        for group in self.groups:
            group_values = self.clean_data[self.clean_data[self.group_col] == group][self.value_col].values
            self.group_data[group] = group_values
        
        self.n_total = len(self.values)
        print(f"Data prepared - {self.k} groups, {self.n_total} total observations")
        
    def _prepare_data_from_lists(self, groups, values):
        """Prepare data from separate lists"""
        if len(groups) != len(values):
            raise ValueError("Groups and values must have same length")
        
        self.group_labels = np.array(groups)
        self.values = np.array(values)
        
        # Get unique groups
        self.groups = sorted(list(set(groups)))
        self.k = len(self.groups)
        
        # Organize data by groups
        self.group_data = {}
        for group in self.groups:
            mask = self.group_labels == group
            self.group_data[group] = self.values[mask]
        
        self.n_total = len(self.values)
        print(f"Data prepared - {self.k} groups, {self.n_total} total observations")
    
    def descriptive_statistics(self):
        """Calculate descriptive statistics for each group"""
        print("Calculating descriptive statistics...")
        
        descriptives = {}
        
        for group in self.groups:
            data = self.group_data[group]
            
            descriptives[group] = {
                'n': len(data),
                'mean': np.mean(data),
                'std': np.std(data, ddof=1),  # Sample standard deviation
                'var': np.var(data, ddof=1),  # Sample variance
                'min': np.min(data),
                'max': np.max(data),
                'median': np.median(data),
                'q1': np.percentile(data, 25),
                'q3': np.percentile(data, 75),
                'se': np.std(data, ddof=1) / np.sqrt(len(data))  # Standard error
            }
        
        self.results['descriptives'] = descriptives
        return descriptives
    
    def anova_calculation(self):
        """Perform ANOVA calculations"""
        print("Performing ANOVA calculations...")
        
        # Overall statistics
        grand_mean = np.mean(self.values)
        
        # Calculate Sum of Squares
        # Between groups (SSB)
        ssb = 0
        for group in self.groups:
            group_data = self.group_data[group]
            n_group = len(group_data)
            group_mean = np.mean(group_data)
            ssb += n_group * (group_mean - grand_mean) ** 2
        
        # Within groups (SSW) - also called SSE (Sum of Squares Error)
        ssw = 0
        for group in self.groups:
            group_data = self.group_data[group]
            group_mean = np.mean(group_data)
            ssw += np.sum((group_data - group_mean) ** 2)
        
        # Total Sum of Squares (SST)
        sst = np.sum((self.values - grand_mean) ** 2)
        
        # Degrees of freedom
        df_between = self.k - 1  # k-1 where k is number of groups
        df_within = self.n_total - self.k  # N-k where N is total observations
        df_total = self.n_total - 1  # N-1
        
        # Mean Squares
        msb = ssb / df_between  # Mean Square Between
        msw = ssw / df_within   # Mean Square Within
        
        # F-statistic
        f_statistic = msb / msw
        
        # p-value
        p_value = 1 - stats.f.cdf(f_statistic, df_between, df_within)
        
        # Effect size (Eta-squared)
        eta_squared = ssb / sst
        
        # Omega-squared (less biased effect size)
        omega_squared = (ssb - df_between * msw) / (sst + msw)
        omega_squared = max(0, omega_squared)  # Cannot be negative
        
        # Store results
        anova_results = {
            'grand_mean': grand_mean,
            'ssb': ssb,
            'ssw': ssw, 
            'sst': sst,
            'df_between': df_between,
            'df_within': df_within,
            'df_total': df_total,
            'msb': msb,
            'msw': msw,
            'f_statistic': f_statistic,
            'p_value': p_value,
            'eta_squared': eta_squared,
            'omega_squared': omega_squared,
            'significant': p_value < 0.05
        }
        
        self.results['anova'] = anova_results
        return anova_results
    
    def assumption_tests(self):
        """Test ANOVA assumptions"""
        print("Testing ANOVA assumptions...")
        
        assumptions = {}
        
        # 1. Test for normality (Shapiro-Wilk for each group)
        normality_tests = {}
        for group in self.groups:
            data = self.group_data[group]
            if len(data) >= 3:  # Need at least 3 observations
                stat, p_val = stats.shapiro(data)
                normality_tests[group] = {
                    'statistic': stat,
                    'p_value': p_val,
                    'normal': p_val > 0.05
                }
            else:
                normality_tests[group] = {
                    'statistic': None,
                    'p_value': None,
                    'normal': None
                }
        
        assumptions['normality'] = normality_tests
        
        # 2. Test for homogeneity of variance (Levene's test)
        group_arrays = [self.group_data[group] for group in self.groups]
        levene_stat, levene_p = stats.levene(*group_arrays)
        
        assumptions['homogeneity'] = {
            'levene_statistic': levene_stat,
            'levene_p_value': levene_p,
            'equal_variances': levene_p > 0.05
        }
        
        # 3. Bartlett's test (more sensitive to normality violations)
        bartlett_stat, bartlett_p = stats.bartlett(*group_arrays)
        
        assumptions['bartlett'] = {
            'bartlett_statistic': bartlett_stat,
            'bartlett_p_value': bartlett_p,
            'equal_variances': bartlett_p > 0.05
        }
        
        # 4. Test for outliers (using IQR method for each group)
        outliers = {}
        for group in self.groups:
            data = self.group_data[group]
            q1 = np.percentile(data, 25)
            q3 = np.percentile(data, 75)
            iqr = q3 - q1
            lower_bound = q1 - 1.5 * iqr
            upper_bound = q3 + 1.5 * iqr
            
            group_outliers = data[(data < lower_bound) | (data > upper_bound)]
            outliers[group] = {
                'outlier_values': group_outliers,
                'n_outliers': len(group_outliers),
                'percentage': len(group_outliers) / len(data) * 100
            }
        
        assumptions['outliers'] = outliers
        
        self.results['assumptions'] = assumptions
        return assumptions
    
    def post_hoc_tests(self, method='tukey'):
        """Perform post-hoc pairwise comparisons"""
        print(f"Performing post-hoc tests ({method})...")
        
        if method.lower() == 'tukey':
            return self._tukey_hsd()
        elif method.lower() == 'bonferroni':
            return self._bonferroni_correction()
        elif method.lower() == 'lsd':
            return self._fisher_lsd()
        else:
            print("Available methods: 'tukey', 'bonferroni', 'lsd'")
            return self._tukey_hsd()
    
    def _tukey_hsd(self):
        """Tukey's Honestly Significant Difference test"""
        from scipy.stats import studentized_range
        
        # Get MSE and degrees of freedom
        msw = self.results['anova']['msw']
        df_within = self.results['anova']['df_within']
        
        # Studentized range critical value
        alpha = 0.05
        q_critical = studentized_range.ppf(1 - alpha, self.k, df_within)
        
        comparisons = []
        
        for group1, group2 in combinations(self.groups, 2):
            # Group statistics
            data1 = self.group_data[group1]
            data2 = self.group_data[group2]
            mean1 = np.mean(data1)
            mean2 = np.mean(data2)
            n1, n2 = len(data1), len(data2)
            
            # Mean difference
            mean_diff = abs(mean1 - mean2)
            
            # Standard error for the difference
            se_diff = np.sqrt(msw * (1/n1 + 1/n2))
            
            # HSD critical difference
            hsd = q_critical * se_diff / np.sqrt(2)
            
            # Test statistic
            q_stat = mean_diff / se_diff * np.sqrt(2)
            
            # p-value (approximate)
            p_value = 1 - studentized_range.cdf(q_stat, self.k, df_within)
            
            comparisons.append({
                'group1': group1,
                'group2': group2,
                'mean1': mean1,
                'mean2': mean2,
                'mean_diff': mean1 - mean2,  # Keep sign
                'abs_diff': mean_diff,
                'se_diff': se_diff,
                'q_statistic': q_stat,
                'hsd_critical': hsd,
                'p_value': p_value,
                'significant': mean_diff > hsd
            })
        
        self.results['post_hoc_tukey'] = comparisons
        return comparisons
    
    def _bonferroni_correction(self):
        """Bonferroni correction for multiple t-tests"""
        msw = self.results['anova']['msw']
        df_within = self.results['anova']['df_within']
        
        # Number of comparisons
        num_comparisons = len(list(combinations(self.groups, 2)))
        alpha_corrected = 0.05 / num_comparisons
        
        t_critical = stats.t.ppf(1 - alpha_corrected/2, df_within)
        
        comparisons = []
        
        for group1, group2 in combinations(self.groups, 2):
            data1 = self.group_data[group1]
            data2 = self.group_data[group2]
            mean1 = np.mean(data1)
            mean2 = np.mean(data2)
            n1, n2 = len(data1), len(data2)
            
            # Mean difference
            mean_diff = mean1 - mean2
            
            # Standard error
            se_diff = np.sqrt(msw * (1/n1 + 1/n2))
            
            # t-statistic
            t_stat = mean_diff / se_diff
            
            # p-value (two-tailed)
            p_value = 2 * (1 - stats.t.cdf(abs(t_stat), df_within))
            p_value_corrected = min(p_value * num_comparisons, 1.0)
            
            # Critical difference
            critical_diff = t_critical * se_diff
            
            comparisons.append({
                'group1': group1,
                'group2': group2,
                'mean1': mean1,
                'mean2': mean2,
                'mean_diff': mean_diff,
                'se_diff': se_diff,
                't_statistic': t_stat,
                'p_value': p_value,
                'p_value_corrected': p_value_corrected,
                'critical_diff': critical_diff,
                'significant': p_value_corrected < 0.05
            })
        
        self.results['post_hoc_bonferroni'] = comparisons
        return comparisons
    
    def _fisher_lsd(self):
        """Fisher's Least Significant Difference test"""
        msw = self.results['anova']['msw']
        df_within = self.results['anova']['df_within']
        
        t_critical = stats.t.ppf(0.975, df_within)  # Two-tailed, α = 0.05
        
        comparisons = []
        
        for group1, group2 in combinations(self.groups, 2):
            data1 = self.group_data[group1]
            data2 = self.group_data[group2]
            mean1 = np.mean(data1)
            mean2 = np.mean(data2)
            n1, n2 = len(data1), len(data2)
            
            # Mean difference
            mean_diff = mean1 - mean2
            
            # Standard error
            se_diff = np.sqrt(msw * (1/n1 + 1/n2))
            
            # t-statistic
            t_stat = mean_diff / se_diff
            
            # p-value
            p_value = 2 * (1 - stats.t.cdf(abs(t_stat), df_within))
            
            # LSD critical difference
            lsd = t_critical * se_diff
            
            comparisons.append({
                'group1': group1,
                'group2': group2,
                'mean1': mean1,
                'mean2': mean2,
                'mean_diff': mean_diff,
                'se_diff': se_diff,
                't_statistic': t_stat,
                'p_value': p_value,
                'lsd_critical': lsd,
                'significant': abs(mean_diff) > lsd
            })
        
        self.results['post_hoc_lsd'] = comparisons
        return comparisons
    
    def analyze(self, post_hoc_method='tukey'):
        """
        Perform complete ANOVA analysis
        
        Parameters:
        -----------
        post_hoc_method : str
            'tukey', 'bonferroni', or 'lsd'
        """
        print(f"\n{'='*60}")
        print(f"{'ONE-WAY ANOVA ANALYSIS':^60}")
        print(f"{'='*60}")
        print(f"Groups: {self.groups}")
        print(f"Total observations: {self.n_total}")
        print(f"{'='*60}\n")
        
        # Perform all analyses
        self.descriptive_statistics()
        self.anova_calculation()
        self.assumption_tests()
        
        # Post-hoc tests only if ANOVA is significant
        if self.results['anova']['significant']:
            self.post_hoc_tests(post_hoc_method)
        else:
            print("ANOVA not significant - skipping post-hoc tests")
        
        # Effect size interpretation
        self._interpret_effect_size()
        
        print("ANOVA analysis completed!")
    
    def _interpret_effect_size(self):
        """Interpret effect size"""
        eta_squared = self.results['anova']['eta_squared']
        omega_squared = self.results['anova']['omega_squared']
        
        # Cohen's guidelines for eta-squared
        if eta_squared >= 0.14:
            eta_interpretation = "Large effect"
        elif eta_squared >= 0.06:
            eta_interpretation = "Medium effect"
        elif eta_squared >= 0.01:
            eta_interpretation = "Small effect"
        else:
            eta_interpretation = "Negligible effect"
        
        # Similar for omega-squared
        if omega_squared >= 0.14:
            omega_interpretation = "Large effect"
        elif omega_squared >= 0.06:
            omega_interpretation = "Medium effect"
        elif omega_squared >= 0.01:
            omega_interpretation = "Small effect"
        else:
            omega_interpretation = "Negligible effect"
        
        self.results['effect_size_interpretation'] = {
            'eta_squared_interpretation': eta_interpretation,
            'omega_squared_interpretation': omega_interpretation
        }
    
    def print_results(self, detailed=True):
        """Print comprehensive ANOVA results"""
        if not self.results:
            print("Please run analysis first using .analyze()")
            return
        
        print(f"\n{'='*70}")
        print(f"{'ONE-WAY ANOVA RESULTS':^70}")
        print(f"{'='*70}")
        
        # Descriptive Statistics
        print(f"\nDescriptive Statistics")
        print(f"{'='*50}")
        print(f"{'Group':<15} {'N':<6} {'Mean':<10} {'SD':<10} {'SE':<10} {'95% CI'}")
        print(f"{'-'*65}")
        
        for group in self.groups:
            desc = self.results['descriptives'][group]
            ci_margin = 1.96 * desc['se']
            ci_lower = desc['mean'] - ci_margin
            ci_upper = desc['mean'] + ci_margin
            
            print(f"{group:<15} {desc['n']:<6} {desc['mean']:<10.3f} {desc['std']:<10.3f} "
                  f"{desc['se']:<10.3f} [{ci_lower:.3f}, {ci_upper:.3f}]")
        
        # ANOVA Table
        anova = self.results['anova']
        print(f"\nANOVA Table")
        print(f"{'='*70}")
        print(f"{'Source':<15} {'SS':<12} {'df':<6} {'MS':<12} {'F':<10} {'p-value':<10} {'Sig'}")
        print(f"{'-'*70}")
        
        # Between groups
        sig_between = "***" if anova['p_value'] < 0.001 else "**" if anova['p_value'] < 0.01 else "*" if anova['p_value'] < 0.05 else ""
        print(f"{'Between Groups':<15} {anova['ssb']:<12.3f} {anova['df_between']:<6} "
              f"{anova['msb']:<12.3f} {anova['f_statistic']:<10.3f} {anova['p_value']:<10.4f} {sig_between}")
        
        # Within groups
        print(f"{'Within Groups':<15} {anova['ssw']:<12.3f} {anova['df_within']:<6} "
              f"{anova['msw']:<12.3f} {'':<10} {'':<10}")
        
        # Total
        print(f"{'Total':<15} {anova['sst']:<12.3f} {anova['df_total']:<6}")
        
        # Effect Size
        print(f"\nEffect Size")
        print(f"{'='*50}")
        print(f"Eta-squared (η²):     {anova['eta_squared']:.4f} ({self.results['effect_size_interpretation']['eta_squared_interpretation']})")
        print(f"Omega-squared (ω²):   {anova['omega_squared']:.4f} ({self.results['effect_size_interpretation']['omega_squared_interpretation']})")
        
        # ANOVA Conclusion
        print(f"\nANOVA Results")
        print(f"{'='*50}")
        if anova['significant']:
            print(f"F({anova['df_between']}, {anova['df_within']}) = {anova['f_statistic']:.3f}, p = {anova['p_value']:.4f}")
            print(f"Result: Significant differences between groups (p < 0.05)")
        else:
            print(f"F({anova['df_between']}, {anova['df_within']}) = {anova['f_statistic']:.3f}, p = {anova['p_value']:.4f}")
            print(f"Result: No significant differences between groups (p ≥ 0.05)")
        
        # Post-hoc results (if available and significant)
        if anova['significant']:
            if 'post_hoc_tukey' in self.results:
                self._print_post_hoc_results('tukey')
            elif 'post_hoc_bonferroni' in self.results:
                self._print_post_hoc_results('bonferroni')
            elif 'post_hoc_lsd' in self.results:
                self._print_post_hoc_results('lsd')
        
        # Assumption checks
        if detailed:
            self._print_assumption_results()
        
        print(f"\n{'='*70}")
    
    def _print_post_hoc_results(self, method):
        """Print post-hoc test results"""
        print(f"\nPost-hoc Tests ({method.upper()})")
        print(f"{'='*60}")
        print(f"{'Comparison':<20} {'Mean Diff':<12} {'p-value':<12} {'Significant'}")
        print(f"{'-'*60}")
        
        if method == 'tukey':
            comparisons = self.results['post_hoc_tukey']
            for comp in comparisons:
                comparison = f"{comp['group1']} vs {comp['group2']}"
                print(f"{comparison:<20} {comp['mean_diff']:<12.3f} {comp['p_value']:<12.4f} "
                      f"{'Yes' if comp['significant'] else 'No'}")
        
        elif method == 'bonferroni':
            comparisons = self.results['post_hoc_bonferroni']
            for comp in comparisons:
                comparison = f"{comp['group1']} vs {comp['group2']}"
                print(f"{comparison:<20} {comp['mean_diff']:<12.3f} {comp['p_value_corrected']:<12.4f} "
                      f"{'Yes' if comp['significant'] else 'No'}")
        
        elif method == 'lsd':
            comparisons = self.results['post_hoc_lsd']
            for comp in comparisons:
                comparison = f"{comp['group1']} vs {comp['group2']}"
                print(f"{comparison:<20} {comp['mean_diff']:<12.3f} {comp['p_value']:<12.4f} "
                      f"{'Yes' if comp['significant'] else 'No'}")
    
    def _print_assumption_results(self):
        """Print assumption test results"""
        assumptions = self.results['assumptions']
        
        print(f"\nAssumption Tests")
        print(f"{'='*60}")
        
        # Normality tests
        print(f"1. Normality (Shapiro-Wilk test for each group):")
        print(f"{'Group':<15} {'W':<10} {'p-value':<12} {'Normal'}")
        print(f"{'-'*45}")
        
        for group in self.groups:
            norm_test = assumptions['normality'][group]
            if norm_test['statistic'] is not None:
                print(f"{group:<15} {norm_test['statistic']:<10.4f} {norm_test['p_value']:<12.4f} "
                      f"{'Yes' if norm_test['normal'] else 'No'}")
            else:
                print(f"{group:<15} {'N/A':<10} {'N/A':<12} {'N/A'}")
        
        # Homogeneity of variance
        print(f"\n2. Homogeneity of Variance:")
        levene = assumptions['homogeneity']
        print(f"   Levene's test: F = {levene['levene_statistic']:.4f}, p = {levene['levene_p_value']:.4f}")
        print(f"   Equal variances: {'Yes' if levene['equal_variances'] else 'No'}")
        
        bartlett = assumptions['bartlett']
        print(f"   Bartlett's test: χ² = {bartlett['bartlett_statistic']:.4f}, p = {bartlett['bartlett_p_value']:.4f}")
        print(f"   Equal variances: {'Yes' if bartlett['equal_variances'] else 'No'}")
        
        # Outliers
        print(f"\n3. Outliers (IQR method):")
        print(f"{'Group':<15} {'N Outliers':<12} {'Percentage'}")
        print(f"{'-'*35}")
        
        for group in self.groups:
            outlier_info = assumptions['outliers'][group]
            print(f"{group:<15} {outlier_info['n_outliers']:<12} {outlier_info['percentage']:<10.1f}%")
    
    def plot_results(self, figsize=(15, 10), save_path=None):
        """Create comprehensive visualization of ANOVA results"""
        if not self.results:
            print("Please run analysis first using .analyze()")
            return
        
        fig, axes = plt.subplots(2, 3, figsize=figsize)
        fig.suptitle('One-Way ANOVA Results', fontsize=16, fontweight='bold')
        
        # 1. Box plot
        group_data_list = [self.group_data[group] for group in self.groups]
        axes[0, 0].boxplot(group_data_list, labels=self.groups)
        axes[0, 0].set_title('Box Plot by Group')
        axes[0, 0].set_ylabel('Values')
        axes[0, 0].grid(True, alpha=0.3)
        
        # 2. Mean plot with error bars
        means = [self.results['descriptives'][group]['mean'] for group in self.groups]
        ses = [self.results['descriptives'][group]['se'] for group in self.groups]
        
        x_pos = range(len(self.groups))
        bars = axes[0, 1].bar(x_pos, means, yerr=[1.96*se for se in ses], 
                             capsize=5, alpha=0.7, color='skyblue', edgecolor='black')
        axes[0, 1].set_title('Group Means with 95% CI')
        axes[0, 1].set_ylabel('Mean Values')
        axes[0, 1].set_xticks(x_pos)
        axes[0, 1].set_xticklabels(self.groups)
        axes[0, 1].grid(True, alpha=0.3)
        
        # Add significance indicators if ANOVA is significant
        if self.results['anova']['significant']:
            max_height = max(means) + max(ses) * 1.96
            axes[0, 1].text(len(self.groups)/2 - 0.5, max_height * 1.1, 
                           f"F = {self.results['anova']['f_statistic']:.3f}*", 
                           ha='center', fontweight='bold')
        
        # 3. Residual plot
        # Calculate residuals
        all_residuals = []
        fitted_values = []
        for group in self.groups:
            group_data = self.group_data[group]
            group_mean = self.results['descriptives'][group]['mean']
            residuals = group_data - group_mean
            all_residuals.extend(residuals)
            fitted_values.extend([group_mean] * len(group_data))
        
        axes[0, 2].scatter(fitted_values, all_residuals, alpha=0.6)
        axes[0, 2].axhline(y=0, color='red', linestyle='--', alpha=0.7)
        axes[0, 2].set_title('Residuals vs Fitted Values')
        axes[0, 2].set_xlabel('Fitted Values')
        axes[0, 2].set_ylabel('Residuals')
        axes[0, 2].grid(True, alpha=0.3)
        
        # 4. Q-Q plot for normality check
        from scipy.stats import probplot
        probplot(all_residuals, dist="norm", plot=axes[1, 0])
        axes[1, 0].set_title('Q-Q Plot (Normality Check)')
        axes[1, 0].grid(True, alpha=0.3)
        
        # 5. Distribution comparison (histogram)
        colors = plt.cm.Set3(np.linspace(0, 1, len(self.groups)))
        for i, group in enumerate(self.groups):
            axes[1, 1].hist(self.group_data[group], alpha=0.6, label=group, 
                           color=colors[i], bins=15)
        axes[1, 1].set_title('Distribution by Group')
        axes[1, 1].set_xlabel('Values')
        axes[1, 1].set_ylabel('Frequency')
        axes[1, 1].legend()
        axes[1, 1].grid(True, alpha=0.3)
        
        # 6. Effect size visualization
        eta_squared = self.results['anova']['eta_squared']
        omega_squared = self.results['anova']['omega_squared']
        
        effect_measures = ['Eta²', 'Omega²']
        effect_values = [eta_squared, omega_squared]
        
        bars = axes[1, 2].bar(effect_measures, effect_values, 
                             color=['orange', 'green'], alpha=0.7)
        axes[1, 2].set_title('Effect Size Measures')
        axes[1, 2].set_ylabel('Effect Size')
        axes[1, 2].set_ylim(0, max(1, max(effect_values) * 1.2))
        
        # Add effect size interpretation lines
        axes[1, 2].axhline(y=0.01, color='gray', linestyle=':', alpha=0.7, label='Small (0.01)')
        axes[1, 2].axhline(y=0.06, color='gray', linestyle='--', alpha=0.7, label='Medium (0.06)')
        axes[1, 2].axhline(y=0.14, color='gray', linestyle='-', alpha=0.7, label='Large (0.14)')
        
        # Add values on bars
        for bar, value in zip(bars, effect_values):
            height = bar.get_height()
            axes[1, 2].text(bar.get_x() + bar.get_width()/2., height + 0.01,
                           f'{value:.3f}', ha='center', va='bottom', fontweight='bold')
        
        axes[1, 2].grid(True, alpha=0.3)
        
        plt.tight_layout()
        
        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')
            print(f"Plot saved: {save_path}")
        
        plt.show()

def generate_anova_data(scenario="treatment_effect", n_per_group=20, seed=42):
    """
    Generate example data for ANOVA
    
    Parameters:
    -----------
    scenario : str
        "treatment_effect", "learning_methods", "fertilizer_study", "drug_dosage"
    n_per_group : int
        Sample size per group
    seed : int
        Random seed
    """
    np.random.seed(seed)
    
    if scenario == "treatment_effect":
        # Psychology study: Control vs Therapy vs Medication
        
        # Control group (no treatment)
        control = np.random.normal(50, 10, n_per_group)  # Depression scores
        
        # Therapy group (moderate improvement)
        therapy = np.random.normal(40, 8, n_per_group)
        
        # Medication group (strong improvement)
        medication = np.random.normal(30, 9, n_per_group)
        
        data = pd.DataFrame({
            'group': ['Control'] * n_per_group + ['Therapy'] * n_per_group + ['Medication'] * n_per_group,
            'depression_score': np.concatenate([control, therapy, medication]),
            'age': np.random.randint(18, 65, n_per_group * 3),
            'gender': np.random.choice(['M', 'F'], n_per_group * 3)
        })
        
        print("Treatment Effect Scenario Generated")
        print("- Groups: Control, Therapy, Medication")
        print("- DV: depression_score (lower = better)")
        print("- Expected: Medication < Therapy < Control")
        
        return data, 'group', 'depression_score'
    
    elif scenario == "learning_methods":
        # Education study: Lecture vs Online vs Hybrid learning
        
        # Traditional lecture
        lecture = np.random.normal(75, 12, n_per_group)  # Test scores
        
        # Online learning  
        online = np.random.normal(78, 15, n_per_group)
        
        # Hybrid learning (best)
        hybrid = np.random.normal(85, 10, n_per_group)
        
        data = pd.DataFrame({
            'learning_method': ['Lecture'] * n_per_group + ['Online'] * n_per_group + ['Hybrid'] * n_per_group,
            'test_score': np.concatenate([lecture, online, hybrid]),
            'prior_gpa': np.random.normal(3.0, 0.5, n_per_group * 3),
            'study_hours': np.random.normal(15, 5, n_per_group * 3)
        })
        
        print("Learning Methods Scenario Generated")
        print("- Groups: Lecture, Online, Hybrid")
        print("- DV: test_score (higher = better)")
        print("- Expected: Hybrid > Online ≈ Lecture")
        
        return data, 'learning_method', 'test_score'
    
    elif scenario == "fertilizer_study":
        # Agriculture study: Different fertilizer types
        
        # No fertilizer (control)
        control = np.random.normal(20, 4, n_per_group)  # Plant height (cm)
        
        # Organic fertilizer
        organic = np.random.normal(25, 5, n_per_group)
        
        # Chemical fertilizer
        chemical = np.random.normal(30, 6, n_per_group)
        
        # Mixed fertilizer
        mixed = np.random.normal(35, 4, n_per_group)
        
        data = pd.DataFrame({
            'fertilizer_type': (['Control'] * n_per_group + 
                               ['Organic'] * n_per_group + 
                               ['Chemical'] * n_per_group + 
                               ['Mixed'] * n_per_group),
            'plant_height': np.concatenate([control, organic, chemical, mixed]),
            'soil_ph': np.random.normal(6.5, 0.8, n_per_group * 4),
            'water_amount': np.random.normal(100, 20, n_per_group * 4)
        })
        
        print("Fertilizer Study Scenario Generated")
        print("- Groups: Control, Organic, Chemical, Mixed")
        print("- DV: plant_height (cm)")
        print("- Expected: Mixed > Chemical > Organic > Control")
        
        return data, 'fertilizer_type', 'plant_height'
    
    elif scenario == "drug_dosage":
        # Medical study: Different drug dosages
        
        # Placebo
        placebo = np.random.normal(2, 1.5, n_per_group)  # Pain reduction (0-10 scale)
        
        # Low dose
        low_dose = np.random.normal(4, 1.8, n_per_group)
        
        # Medium dose
        medium_dose = np.random.normal(6, 1.5, n_per_group)
        
        # High dose (plateaus, side effects)
        high_dose = np.random.normal(6.5, 2.0, n_per_group)
        
        data = pd.DataFrame({
            'dosage_group': (['Placebo'] * n_per_group + 
                           ['Low'] * n_per_group + 
                           ['Medium'] * n_per_group + 
                           ['High'] * n_per_group),
            'pain_reduction': np.concatenate([placebo, low_dose, medium_dose, high_dose]),
            'baseline_pain': np.random.normal(7, 1.5, n_per_group * 4),
            'patient_age': np.random.randint(25, 75, n_per_group * 4)
        })
        
        print("Drug Dosage Scenario Generated")
        print("- Groups: Placebo, Low, Medium, High")
        print("- DV: pain_reduction (0-10 scale)")
        print("- Expected: Medium ≈ High > Low > Placebo")
        
        return data, 'dosage_group', 'pain_reduction'

def run_anova_example(scenario="treatment_effect", n_per_group=25, post_hoc='tukey'):
    """Run example ANOVA analysis"""
    print(f"ONE-WAY ANOVA EXAMPLE")
    print(f"Scenario: {scenario}")
    print("="*70)
    
    # 1. Generate data
    print("1. Generating example data...")
    data, group_col, value_col = generate_anova_data(scenario=scenario, n_per_group=n_per_group)
    print(f"Data generated: {data.shape}")
    
    # Data preview
    print(f"\nData Preview:")
    print(data.head())
    
    print(f"\nGroup Summary:")
    print(data.groupby(group_col)[value_col].agg(['count', 'mean', 'std']).round(3))
    
    # 2. Perform ANOVA
    print(f"\n2. Performing One-Way ANOVA...")
    anova = OneWayANOVA(data=data, group_col=group_col, value_col=value_col)
    anova.analyze(post_hoc_method=post_hoc)
    
    # 3. Print results
    print(f"\n3. Analysis Results:")
    anova.print_results(detailed=True)
    
    # 4. Create visualizations
    print(f"\n4. Creating visualizations...")
    anova.plot_results()
    
    return anova, data

if __name__ == "__main__":
    print("ONE-WAY ANOVA - Python Implementation")
    print("="*80)
    
    # Run example analysis
    anova_analysis, sample_data = run_anova_example(
        scenario="treatment_effect",
        n_per_group=25,
        post_hoc='tukey'
    )
    
    print("\n" + "="*80)
    print("USAGE GUIDE:")
    print("="*80)
    print('''
Basic Usage:
```python
# 1. From DataFrame
data = pd.DataFrame({
    'group': ['A', 'A', 'B', 'B', 'C', 'C', ...],
    'value': [1.2, 1.5, 2.3, 2.1, 3.4, 3.2, ...]
})

anova = OneWayANOVA(data=data, group_col='group', value_col='value')
anova.analyze(post_hoc_method='tukey')
anova.print_results()
anova.plot_results()

# 2. From separate lists
groups = ['A', 'A', 'B', 'B', 'C', 'C']
values = [1.2, 1.5, 2.3, 2.1, 3.4, 3.2]

anova = OneWayANOVA(groups=groups, values=values)
anova.analyze()
```

Other scenarios:
```python
# Education study
run_anova_example(scenario="learning_methods")

# Agriculture study  
run_anova_example(scenario="fertilizer_study")

# Medical study
run_anova_example(scenario="drug_dosage")
```

Post-hoc options:
- 'tukey': Tukey's HSD (most common)
- 'bonferroni': Bonferroni correction
- 'lsd': Fisher's LSD (least conservative)
    ''')
    
    print("\nOne-Way ANOVA analysis completed!")
    print("Use the guide above to analyze your own data.")
