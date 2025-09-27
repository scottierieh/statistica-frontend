
import sys
import json
import numpy as np
import pandas as pd
import scipy.stats as stats
from scipy.stats import chi2
import warnings

# 전문 SEM 패키지
try:
    import semopy
    HAS_SEMOPY = True
except ImportError:
    HAS_SEMOPY = False

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
        if not HAS_SEMOPY:
            return self._alternative_structural_analysis()
        
        model_syntax = self._generate_model_syntax()
        
        try:
            model = semopy.Model(model_syntax)
            results = model.fit(self.data)
            
            fit_indices = self._extract_fit_indices(results)
            parameter_estimates = self._extract_parameter_estimates(results)
            
            self.results = {
                'fit_indices': fit_indices,
                'parameter_estimates': parameter_estimates,
                'convergence': results.success,
            }
            return self.results
            
        except Exception as e:
            return self._alternative_structural_analysis(error=str(e))
    
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
    
    def _extract_fit_indices(self, results):
        """적합도 지수 추출"""
        try:
            stats = results.stats
            return {
                'chi_square': stats.get('chi2'),
                'df': stats.get('dof'),
                'p_value': stats.get('chi2_pvalue'),
                'cfi': stats.get('cfi'),
                'tli': stats.get('tli'),
                'rmsea': stats.get('rmsea'),
                'srmr': stats.get('srmr'),
                'aic': stats.get('aic'),
                'bic': stats.get('bic'),
            }
        except:
            return {'error': 'Failed to extract fit indices'}
    
    def _extract_parameter_estimates(self, results):
        """모수 추정치 추출"""
        try:
            params = results.inspect()
            params.rename(columns={'p-value': 'p_value'}, inplace=True)
            return params.to_dict('records')
        except:
            return {'error': 'Failed to extract parameter estimates'}
            
    def _alternative_structural_analysis(self, error=None):
        """대안 구조모형 분석 (semopy 없을 때)"""
        return {
            'error': error or 'semopy가 필요합니다. pip install semopy로 설치하세요.',
            'alternative': '단순 회귀분석 결과로 대체할 수 있습니다.'
        }
    
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
        
        # Plotting is handled in a separate step or is part of a larger component in frontend
        if HAS_SEMOPY and 'error' not in analysis_results:
             # This part for plot generation can be tricky as it saves to file.
             # We might need a fallback or handle it differently.
             pass

        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()

    