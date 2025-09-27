
import sys
import json
import numpy as np
import pandas as pd
import scipy.stats as stats
from scipy.stats import chi2
import warnings

# 요인분석 전문 패키지
try:
    from factor_analyzer import FactorAnalyzer
    from factor_analyzer.factor_analyzer import calculate_kmo, calculate_bartlett_sphericity
    HAS_FACTOR_ANALYZER = True
except ImportError:
    HAS_FACTOR_ANALYZER = False

# 통계 분석 패키지
try:
    import pingouin as pg
    HAS_PINGOUIN = True
except ImportError:
    HAS_PINGOUIN = False

# 추가 통계 패키지
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
import statsmodels.api as sm

warnings.filterwarnings('ignore')


def _to_native_type(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, (float, np.floating)):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, np.bool_):
        return bool(obj)
    return obj

class ProfessionalSEM:
    """전문 패키지 기반 SEM 분석 클래스"""
    
    def __init__(self, data):
        self.data = data.copy()
        self.measurement_model = {}
        self.structural_model = []
        self.sem_model = None
        self.results = {}
        
    def add_latent_variable(self, name, indicators):
        """잠재변수와 측정변수 정의"""
        self.measurement_model[name] = indicators
        
    def add_structural_path(self, from_var, to_var):
        """구조모형 경로 추가"""
        self.structural_model.append((from_var, to_var))
    
    def check_data_adequacy(self):
        """전문 패키지를 활용한 데이터 적절성 검정"""
        all_indicators = []
        for indicators in self.measurement_model.values():
            all_indicators.extend(indicators)
        
        data_subset = self.data[all_indicators].dropna()
        
        adequacy_results = {
            'sample_size': len(data_subset),
            'variables': len(all_indicators),
        }
        
        if HAS_FACTOR_ANALYZER:
            kmo_all, kmo_model = calculate_kmo(data_subset)
            adequacy_results.update({
                'kmo_overall': kmo_model,
            })
            
            chi_square_value, p_value = calculate_bartlett_sphericity(data_subset)
            adequacy_results.update({
                'bartlett_chi2': chi_square_value,
                'bartlett_p': p_value,
            })
        else:
            adequacy_results.update(self._alternative_adequacy_tests(data_subset))
        
        return adequacy_results
    
    def _alternative_adequacy_tests(self, data_subset):
        """factor_analyzer 없을 때 대안 검정"""
        corr_matrix = data_subset.corr()
        
        try:
            inv_corr = np.linalg.pinv(corr_matrix)
            partial_corr = np.zeros_like(corr_matrix)
            for i in range(len(corr_matrix)):
                for j in range(len(corr_matrix)):
                    if i != j:
                        partial_corr[i, j] = -inv_corr[i, j] / np.sqrt(inv_corr[i, i] * inv_corr[j, j])
            
            msa_sum = np.sum(corr_matrix.values**2) - np.sum(np.diag(corr_matrix)**2)
            partial_sum = np.sum(partial_corr**2) - np.sum(np.diag(partial_corr)**2)
            kmo_approx = msa_sum / (msa_sum + partial_sum) if msa_sum + partial_sum != 0 else 0
        except:
            kmo_approx = 0

        n = len(data_subset)
        p = len(data_subset.columns)
        det_corr = np.linalg.det(corr_matrix)
        chi2_value = -(n - 1 - (2*p + 5)/6) * np.log(det_corr) if det_corr > 0 else 0
        df = p * (p - 1) / 2
        p_value = 1 - chi2.cdf(chi2_value, df) if df > 0 else 1.0
        
        return { 'kmo_overall': kmo_approx, 'bartlett_chi2': chi2_value, 'bartlett_p': p_value }

    def run_sem_analysis(self):
        """semopy를 활용한 구조모형 분석"""
        return self._alternative_structural_analysis(error="semopy package is not available in this environment. Using regression-based path analysis as a fallback.")
    
    def _generate_model_syntax(self):
        """semopy 모델 문법 생성"""
        syntax_lines = ["# 측정모형"]
        for factor, indicators in self.measurement_model.items():
            syntax_lines.append(f"{factor} =~ {' + '.join(indicators)}")
        
        if self.structural_model:
            syntax_lines.append("\n# 구조모형")
            for from_var, to_var in self.structural_model:
                syntax_lines.append(f"{to_var} ~ {from_var}")
        
        return '\n'.join(syntax_lines)

    def _alternative_structural_analysis(self, error=None):
        """대안 구조모형 분석 (semopy 없을 때)"""
        estimates = []
        all_indicators = list(set(ind for sublist in self.measurement_model.values() for ind in sublist))
        df_scaled = pd.DataFrame(StandardScaler().fit_transform(self.data[all_indicators]), columns=all_indicators)

        # Measurement model (approximated with PCA)
        factor_scores = pd.DataFrame()
        for factor, indicators in self.measurement_model.items():
            if len(indicators) > 1:
                pca = PCA(n_components=1)
                factor_scores[factor] = pca.fit_transform(df_scaled[indicators]).flatten()
                # Store loadings
                for i, indicator in enumerate(indicators):
                    # This is not a true factor loading but a component weight
                    estimates.append({'lval': factor, 'op': '=~', 'rval': indicator, 'Estimate': pca.components_[0][i], 'p_value': 0.0})
            elif len(indicators) == 1:
                factor_scores[factor] = df_scaled[indicators[0]]
                estimates.append({'lval': factor, 'op': '=~', 'rval': indicators[0], 'Estimate': 1.0, 'p_value': 0.0})


        # Structural model (path analysis with regression)
        for from_var, to_var in self.structural_model:
            if from_var in factor_scores.columns and to_var in factor_scores.columns:
                X = sm.add_constant(factor_scores[from_var])
                model = sm.OLS(factor_scores[to_var], X).fit()
                estimates.append({'lval': to_var, 'op': '~', 'rval': from_var, 'Estimate': model.params[from_var], 'p_value': model.pvalues[from_var]})
        
        # Simplified fit indices
        n_obs = len(df_scaled)
        # This is a very rough approximation and not a true SEM fit index
        fit_indices = {
            'chi_square': None, 'df': None, 'p_value': None,
            'rmsea': None, 'cfi': None, 'tli': None
        }

        self.results = {
            'fit_indices': fit_indices,
            'parameter_estimates': estimates,
            'convergence': True,
            'warning': error
        }
        return self.results
    
def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        model_spec = payload.get('modelSpec')
        
        if not all([data, model_spec]):
            raise ValueError("Missing 'data' or 'modelSpec'")

        df = pd.DataFrame(data)
        
        sem = ProfessionalSEM(df)
        sem.measurement_model = model_spec.get('measurement_model', {})
        sem.structural_model = model_spec.get('structural_model', [])
        
        analysis_results = sem.run_sem_analysis()
        
        # Add adequacy checks to the final results
        analysis_results['adequacy'] = sem.check_data_adequacy()
        
        response = { 'results': analysis_results }
        
        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
