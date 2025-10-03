import sys
import json
import pandas as pd
import numpy as np
from scipy import stats
from scipy.stats import f as f_dist
import matplotlib.pyplot as plt
import seaborn as sns
import base64
from io import BytesIO

class RepeatedMeasuresANOVA:
    """반복측정 분산분석 with 구형성 보정"""
    
    def __init__(self, data, subject_col, condition_col, value_col, alpha=0.05):
        self.data = data.copy()
        self.subject_col = subject_col
        self.condition_col = condition_col
        self.value_col = value_col
        self.alpha = alpha
        self.results = {}
        self._validate_data()
        
    def _validate_data(self):
        required_cols = [self.subject_col, self.condition_col, self.value_col]
        missing = [col for col in required_cols if col not in self.data.columns]
        if missing:
            raise ValueError(f"누락된 열: {missing}")
        
        if self.data[required_cols].isnull().any().any():
            self.data = self.data.dropna(subset=required_cols)
    
    def fit(self):
        """반복측정 ANOVA 수행"""
        wide_data = self.data.pivot(
            index=self.subject_col,
            columns=self.condition_col,
            values=self.value_col
        )
        
        self.wide_data = wide_data
        self.conditions = wide_data.columns.tolist()
        self.n_subjects = len(wide_data)
        self.n_conditions = len(self.conditions)
        
        self._compute_anova()
        self._test_sphericity()
        self._apply_corrections()
        self._compute_effect_size()
        
        final_p_value = self.get_recommended_result()['p_value']
        if final_p_value < self.alpha:
            self._post_hoc_tests()
        
        return self
    
    def _compute_anova(self):
        data_array = self.wide_data.values
        grand_mean = np.mean(data_array)
        subject_means = np.mean(data_array, axis=1)
        condition_means = np.mean(data_array, axis=0)
        
        SS_total = np.sum((data_array - grand_mean) ** 2)
        SS_subjects = self.n_conditions * np.sum((subject_means - grand_mean) ** 2)
        SS_conditions = self.n_subjects * np.sum((condition_means - grand_mean) ** 2)
        SS_error = SS_total - SS_subjects - SS_conditions
        
        df_conditions = self.n_conditions - 1
        df_subjects = self.n_subjects - 1
        df_error = df_conditions * df_subjects
        
        MS_conditions = SS_conditions / df_conditions if df_conditions > 0 else 0
        MS_error = SS_error / df_error if df_error > 0 else 0
        
        F_value = MS_conditions / MS_error if MS_error > 0 else 0
        p_value = 1 - f_dist.cdf(F_value, df_conditions, df_error) if df_error > 0 and df_conditions > 0 else 1.0
        
        self.results.update({
            'anova_table': {
                'Source': ['Condition', 'Subjects', 'Error', 'Total'],
                'SS': [SS_conditions, SS_subjects, SS_error, SS_total],
                'df': [df_conditions, df_subjects, df_error, self.n_subjects * self.n_conditions - 1],
                'MS': [MS_conditions, SS_subjects/df_subjects if df_subjects > 0 else 0, MS_error, ''],
                'F': [F_value, '', '', ''],
                'p-value': [p_value, '', '', '']
            },
            'F_value': F_value, 'df_conditions': df_conditions, 'df_error': df_error
        })
    
    def _test_sphericity(self):
        if self.n_conditions < 3:
            self.results['sphericity'] = {
                'mauchly_w': 1.0, 'p_value': 1.0, 'sphericity_met': True,
                'epsilon_gg': 1.0, 'epsilon_hf': 1.0,
                'recommendation': '조건이 2개이므로 구형성 검정 불필요'
            }
            return

        data_array = self.wide_data.values
        n = self.n_subjects
        k = self.n_conditions
        
        S = np.cov(data_array, rowvar=False, ddof=1)
        M = np.eye(k) - np.full((k, k), 1/k)
        S_transformed = M.T @ S @ M
        
        # Mauchly's W
        p = k - 1
        det_S = np.linalg.det(S_transformed[1:, 1:])
        tr_S = np.trace(S_transformed)

        if tr_S > 0:
            w = det_S / ((tr_S / p)**p)
            
            # Chi-square approximation
            f = 1 - (2*p**2 + p + 2) / (6*p*(n-1))
            chi2_stat = -(n - 1) * f * np.log(w)
            df_mauchly = (p * (p+1) / 2) - 1
            p_value = 1 - stats.chi2.cdf(chi2_stat, df_mauchly)
        else:
            w, p_value = (np.nan, np.nan)

        # Epsilon calculations
        ss_off_diag = np.sum(S) - np.sum(np.diag(S))
        ss_total = np.sum(S)
        epsilon_gg = (np.sum(np.diag(S))**2 - ss_off_diag**2 / (k*(k-1))) / (k * (np.sum(S**2)) - 2*k*np.sum(S.sum(axis=0)**2)/k + k**2*(np.sum(S)/k**2)**2) # This is a complex formula, simpler one is better
        
        cov_matrix = np.cov(data_array, rowvar=False, ddof=1)
        k = cov_matrix.shape[0]
        mean_diag = np.mean(np.diag(cov_matrix))
        mean_total = np.mean(cov_matrix)
        sum_sq_rows = np.sum(cov_matrix.sum(axis=1)**2)
        sum_sq_elems = np.sum(cov_matrix**2)
        
        epsilon_gg = (k+1)*mean_diag**2 / (2 * (sum_sq_elems - sum_sq_rows/(k) + (k-1)*mean_diag**2 ) ) if (sum_sq_elems - sum_sq_rows/(k) + (k-1)*mean_diag**2 )!=0 else 1
        epsilon_gg = (np.sum(np.diag(cov_matrix)))**2 / ( (k-1) * np.sum(cov_matrix**2) ) if ((k-1) * np.sum(cov_matrix**2))!=0 else 1
        
        # Simpler epsilon calculation
        lambda_ = np.linalg.eigvals(S_transformed)
        lambda_ = lambda_[lambda_ > 1e-10] # remove zero eigenvalues
        epsilon_gg = (np.sum(lambda_)**2) / (p * np.sum(lambda_**2))
        
        epsilon_hf = ((n-1)*(k-1)*epsilon_gg - 2) / ((k-1)*((n-1) - (k-1)*epsilon_gg))
        epsilon_hf = min(1.0, epsilon_hf)

        sphericity_met = p_value > self.alpha if not np.isnan(p_value) else True
        
        if sphericity_met:
            recommendation = "구형성 가정 충족 (p > {:.3f}) - 보정 불필요".format(self.alpha)
        elif epsilon_gg < 0.75:
            recommendation = "구형성 위반 (p <= {:.3f}), Greenhouse-Geisser 보정 권장 (ε < 0.75)".format(self.alpha)
        else:
            recommendation = "구형성 위반 (p <= {:.3f}), Huynh-Feldt 보정 권장 (ε >= 0.75)".format(self.alpha)

        self.results['sphericity'] = {
            'mauchly_w': w, 'p_value': p_value, 'sphericity_met': sphericity_met,
            'epsilon_gg': epsilon_gg, 'epsilon_hf': epsilon_hf,
            'recommendation': recommendation
        }

    def _apply_corrections(self):
        F_value = self.results['F_value']
        df_conditions = self.results['anova_table']['df'][0]
        df_error = self.results['anova_table']['df'][2]
        sph = self.results['sphericity']
        
        df_cond_gg = df_conditions * sph['epsilon_gg']
        df_err_gg = df_error * sph['epsilon_gg']
        p_gg = 1 - f_dist.cdf(F_value, df_cond_gg, df_err_gg)
        
        df_cond_hf = df_conditions * sph['epsilon_hf']
        df_err_hf = df_error * sph['epsilon_hf']
        p_hf = 1 - f_dist.cdf(F_value, df_cond_hf, df_err_hf)
        
        self.results['corrections'] = {
            'Greenhouse-Geisser': {'df1': df_cond_gg, 'df2': df_err_gg, 'p-value': p_gg},
            'Huynh-Feldt': {'df1': df_cond_hf, 'df2': df_err_hf, 'p-value': p_hf}
        }
    
    def _compute_effect_size(self):
        SS_conditions = self.results['anova_table']['SS'][0]
        SS_error = self.results['anova_table']['SS'][2]
        partial_eta_squared = SS_conditions / (SS_conditions + SS_error)
        
        if partial_eta_squared < 0.01: interpretation = 'Negligible'
        elif partial_eta_squared < 0.06: interpretation = 'Small'
        elif partial_eta_squared < 0.14: interpretation = 'Medium'
        else: interpretation = 'Large'
        
        self.results['effect_size'] = {'partial_eta_squared': partial_eta_squared, 'interpretation': interpretation}

    def _post_hoc_tests(self):
        from itertools import combinations
        
        post_hoc = stats.ttest_rel(self.wide_data.iloc[:, 0], self.wide_data.iloc[:, 1])
        
        n_comparisons = len(list(combinations(range(self.n_conditions), 2)))
        bonferroni_alpha = self.alpha / n_comparisons
        
        comparisons = []
        for i, j in combinations(range(self.n_conditions), 2):
            cond1, cond2 = self.conditions[i], self.conditions[j]
            data1, data2 = self.wide_data[cond1], self.wide_data[cond2]
            
            t_stat, p_val = stats.ttest_rel(data1, data2)
            mean_diff = np.mean(data1) - np.mean(data2)
            
            sd_diff = np.std(data1 - data2, ddof=1)
            cohens_d = mean_diff / sd_diff if sd_diff > 0 else 0
            
            comparisons.append({
                'Contrast': f'{cond1} - {cond2}', 'Mean_Diff': mean_diff,
                't-stat': t_stat, 'p-value': p_val,
                'p-bonferroni': min(p_val * n_comparisons, 1.0),
                'significant': p_val < bonferroni_alpha, 'cohens_d': cohens_d
            })
        self.results['post_hoc'] = comparisons

    def get_recommended_result(self):
        sph = self.results['sphericity']
        if sph['sphericity_met']:
            p_val = self.results['anova_table']['p-value'][0]
            return {'method': 'Sphericity Assumed', 'p_value': p_val, 'significant': p_val < self.alpha}
        elif sph['epsilon_gg'] < 0.75:
            p_val = self.results['corrections']['Greenhouse-Geisser']['p-value']
            return {'method': 'Greenhouse-Geisser', 'p_value': p_val, 'significant': p_val < self.alpha}
        else:
            p_val = self.results['corrections']['Huynh-Feldt']['p-value']
            return {'method': 'Huynh-Feldt', 'p_value': p_val, 'significant': p_val < self.alpha}

def create_plots(data, subject_col, condition_col, value_col):
    plots = {}
    
    # Box Plot
    plt.figure(figsize=(10, 6))
    sns.boxplot(x=condition_col, y=value_col, data=data, palette='viridis')
    sns.stripplot(x=condition_col, y=value_col, data=data, color=".25", size=3)
    plt.title('Distribution by Condition', fontsize=16)
    plt.xlabel('Condition', fontsize=12)
    plt.ylabel('Value', fontsize=12)
    buf = BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight')
    plots['boxplot'] = base64.b64encode(buf.getvalue()).decode('utf-8')
    plt.close()

    # Line Plot (Interaction Plot)
    plt.figure(figsize=(10, 6))
    sns.lineplot(x=condition_col, y=value_col, data=data, hue=subject_col, marker='o', legend=None, palette='coolwarm')
    sns.lineplot(x=condition_col, y=value_col, data=data, color='black', marker='o', linewidth=4, errorbar='se', label='Mean')
    plt.title('Repeated Measures by Subject', fontsize=16)
    plt.xlabel('Condition', fontsize=12)
    plt.ylabel('Value', fontsize=12)
    plt.legend()
    buf = BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight')
    plots['lineplot'] = base64.b64encode(buf.getvalue()).decode('utf-8')
    plt.close()
    
    return plots

def main():
    try:
        input_data = json.loads(sys.stdin.read())
        data = pd.DataFrame(input_data['data'])
        subject_col = input_data['subject_col']
        condition_col = input_data['condition_col']
        value_col = input_data['value_col']
        
        model = RepeatedMeasuresANOVA(
            data=data,
            subject_col=subject_col,
            condition_col=condition_col,
            value_col=value_col
        ).fit()
        
        # Prepare results for JSON output
        results = model.results
        results['anova_table'] = pd.DataFrame(results['anova_table']).to_dict(orient='records')
        if 'post_hoc' in results:
            results['post_hoc'] = pd.DataFrame(results['post_hoc']).to_dict(orient='records')

        results['recommended_result'] = model.get_recommended_result()
        
        # Generate Plots
        plots = create_plots(data, subject_col, condition_col, value_col)
        
        output = {'results': results, 'plots': plots}
        
        print(json.dumps(output, allow_nan=True))

    except Exception as e:
        print(json.dumps({'error': str(e)}))
        sys.exit(1)

if __name__ == '__main__':
    main()
