
import sys
import json
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from scipy import stats
from scipy.optimize import minimize
import warnings
import io
import base64

warnings.filterwarnings('ignore')

# Try to import lifelines (professional survival analysis library)
try:
    from lifelines import KaplanMeierFitter, CoxPHFitter, LogNormalAFTFitter, WeibullAFTFitter, NelsonAalenFitter
    from lifelines.statistics import logrank_test, multivariate_logrank_test
    from lifelines.plotting import plot_lifetimes
    LIFELINES_AVAILABLE = True
except ImportError:
    LIFELINES_AVAILABLE = False
    print("Warning: lifelines not available. Install with: pip install lifelines")

def _to_native_type(obj):
    if isinstance(obj, np.integer): return int(obj)
    elif isinstance(obj, np.floating):
        if np.isnan(obj):
            return None
        return float(obj)
    elif isinstance(obj, np.ndarray): return obj.tolist()
    elif isinstance(obj, np.bool_): return bool(obj)
    elif isinstance(obj, pd.Timestamp): return obj.isoformat()
    return obj

class SurvivalAnalyzer:
    """
    A comprehensive survival analysis toolkit
    """
    
    def __init__(self):
        self.data = None
        self.kmf = None
        self.cox_model = None
        self.results = {}
    
    def load_data(self, data, duration_col, event_col, group_col=None, covariates=None):
        """
        Load survival data
        
        Parameters:
        -----------
        data : pd.DataFrame
            Survival data
        duration_col : str
            Column name for survival time/duration
        event_col : str
            Column name for event indicator (1=event, 0=censored)
        group_col : str, optional
            Column name for grouping variable
        covariates : list, optional
            List of covariate column names
        """
        self.data = data.copy()
        self.duration_col = duration_col
        self.event_col = event_col
        self.group_col = group_col
        self.covariates = covariates or []
        
        # Basic data validation
        assert duration_col in data.columns, f"Duration column '{duration_col}' not found"
        assert event_col in data.columns, f"Event column '{event_col}' not found"
        if not self.data[duration_col].apply(lambda x: isinstance(x, (int, float)) and x > 0).all():
             self.data[duration_col] = pd.to_numeric(self.data[duration_col], errors='coerce')
             self.data = self.data.dropna(subset=[duration_col])
             self.data = self.data[self.data[duration_col] > 0]
        
        if not self.data[event_col].isin([0, 1]).all():
            self.data[event_col] = pd.to_numeric(self.data[event_col], errors='coerce')
            self.data = self.data.dropna(subset=[event_col])
            self.data = self.data[self.data[event_col].isin([0,1])]

        return self
    
    def kaplan_meier(self, confidence_interval=0.95):
        """
        Perform Kaplan-Meier survival analysis
        """
        if not LIFELINES_AVAILABLE:
            raise ImportError("lifelines library not found. Please install it.")
        
        # Overall survival curve
        kmf = KaplanMeierFitter()
        kmf.fit(self.data[self.duration_col], 
                self.data[self.event_col], 
                alpha=1-confidence_interval)
        
        self.kmf = kmf
        self.results['kaplan_meier'] = {
            'survival_table': kmf.survival_function_.reset_index().rename(columns={'timeline': 'Time', 'KM_estimate': 'Survival Probability'}).to_dict('records'),
            'confidence_interval': kmf.confidence_interval_.reset_index().to_dict('records'),
            'median_survival_time': kmf.median_survival_time_,
            'timeline': kmf.timeline.tolist()
        }
        
        # Group analysis if specified
        if self.group_col:
            self._kaplan_meier_by_group(confidence_interval)
        
        return self
    
    
    def _kaplan_meier_by_group(self, confidence_interval=0.95):
        """Kaplan-Meier analysis by groups"""
        groups = self.data[self.group_col].unique()
        group_results = {}
        
        for i, group in enumerate(groups):
            group_data = self.data[self.data[self.group_col] == group]
            
            kmf_group = KaplanMeierFitter()
            kmf_group.fit(group_data[self.duration_col], 
                         group_data[self.event_col], 
                         alpha=1-confidence_interval,
                         label=f"{self.group_col}={group}")
            
            group_results[str(group)] = {
                'survival_function': kmf_group.survival_function_.reset_index().to_dict('records'),
                'confidence_interval': kmf_group.confidence_interval_.reset_index().to_dict('records'),
                'median_survival': kmf_group.median_survival_time_,
                'n_events': int(group_data[self.event_col].sum()),
                'n_subjects': len(group_data)
            }
            
        self.results['kaplan_meier_grouped'] = group_results
        
        # Perform log-rank test
        if len(groups) >= 2:
            self.log_rank_test()
    
    def log_rank_test(self):
        """
        Perform log-rank test to compare survival curves
        """
        if not self.group_col:
            return self
        
        if not LIFELINES_AVAILABLE:
            raise ImportError("lifelines library not found for log-rank test.")
        
        groups = self.data[self.group_col].unique()
        
        if len(groups) >= 2:
            results = multivariate_logrank_test(
                self.data[self.duration_col],
                self.data[self.group_col],
                self.data[self.event_col]
            )
            
            self.results['log_rank_test'] = {
                'test_statistic': results.test_statistic,
                'p_value': results.p_value,
                'is_significant': results.p_value < 0.05
            }
        
        return self
    
    def cox_regression(self, show_summary=True):
        """
        Perform Cox proportional hazards regression
        """
        if not LIFELINES_AVAILABLE:
            raise ImportError("Cox regression requires lifelines library")
        
        
        if not self.covariates:
            return self
        
        # Prepare data - one-hot encode categorical covariates
        cox_data = self.data[[self.duration_col, self.event_col] + self.covariates].dropna()

        categorical_covariates = [c for c in self.covariates if self.data[c].dtype == 'object' or self.data[c].dtype == 'category']
        if categorical_covariates:
            cox_data = pd.get_dummies(cox_data, columns=categorical_covariates, drop_first=True)

        self.used_covariates_cox = [c for c in cox_data.columns if c not in [self.duration_col, self.event_col]]
        
        # Fit Cox model
        cph = CoxPHFitter()
        cph.fit(cox_data, duration_col=self.duration_col, event_col=self.event_col)
        
        self.cox_model = cph
        summary_df = cph.summary.reset_index()

        self.results['cox_ph'] = summary_df.to_dict('records')
        self.results['cox_concordance'] = cph.concordance_index_

        return self

    def plot_all(self):
        fig, axes = plt.subplots(2, 2, figsize=(14, 10))
        fig.suptitle('Survival Analysis Overview', fontsize=16, fontweight='bold')
        
        # 1. Overall Survival Curve
        if self.kmf:
            self.kmf.plot_survival_function(ax=axes[0, 0], ci_show=True)
            axes[0, 0].set_title('Kaplan-Meier Survival Curve')
            axes[0, 0].grid(True, alpha=0.3)
            median_survival = self.kmf.median_survival_time_
            if not np.isnan(median_survival):
                axes[0, 0].axvline(median_survival, color='red', linestyle='--', alpha=0.7, label=f'Median: {median_survival:.2f}')
            axes[0,0].legend()


        # 2. Cumulative Hazard
        naf = NelsonAalenFitter()
        naf.fit(self.data[self.duration_col], event_observed=self.data[self.event_col])
        naf.plot_cumulative_hazard(ax=axes[0, 1], ci_show=True)
        axes[0, 1].set_title('Cumulative Hazard Function')
        axes[0, 1].grid(True, alpha=0.3)

        # 3. Grouped Survival Curves
        if self.group_col and 'kaplan_meier_grouped' in self.results:
            groups = self.data[self.group_col].unique()
            for group in groups:
                group_data = self.data[self.data[self.group_col] == group]
                kmf_group = KaplanMeierFitter()
                kmf_group.fit(group_data[self.duration_col], event_observed=group_data[self.event_col], label=str(group))
                kmf_group.plot_survival_function(ax=axes[1, 0])
            axes[1, 0].set_title(f'Survival Curves by {self.group_col}')
            axes[1, 0].legend()
            axes[1, 0].grid(True, alpha=0.3)
        else:
             axes[1, 0].text(0.5, 0.5, 'No group variable selected', ha='center', va='center', fontsize=12, color='gray')
             axes[1, 0].set_title('Grouped Survival Curves')

        # 4. Risk Groups from Cox Model
        if self.cox_model and hasattr(self, 'used_covariates_cox'):
            cox_data_for_pred = self.data[[self.duration_col, self.event_col] + self.covariates].dropna()
            cox_data_for_pred = pd.get_dummies(cox_data_for_pred, columns=[c for c in self.covariates if self.data[c].dtype == 'object'], drop_first=True)
            
            risk_scores = self.cox_model.predict_partial_hazard(cox_data_for_pred[self.used_covariates_cox])
            risk_groups = pd.qcut(risk_scores, q=[0, .33, .66, 1], labels=['Low Risk', 'Medium Risk', 'High Risk'])
            cox_data_for_pred['risk_group'] = risk_groups
            
            for group in ['Low Risk', 'Medium Risk', 'High Risk']:
                group_df = cox_data_for_pred[cox_data_for_pred['risk_group'] == group]
                if not group_df.empty:
                    kmf_risk = KaplanMeierFitter()
                    kmf_risk.fit(group_df[self.duration_col], group_df[self.event_col], label=group)
                    kmf_risk.plot_survival_function(ax=axes[1, 1])
            axes[1, 1].set_title('Survival by Risk Group (Cox Model)')
            axes[1, 1].legend()
            axes[1, 1].grid(True, alpha=0.3)
        else:
            axes[1, 1].text(0.5, 0.5, 'No covariates for Cox model', ha='center', va='center', fontsize=12, color='gray')
            axes[1, 1].set_title('Survival by Risk Group')

        plt.tight_layout(rect=[0, 0.03, 1, 0.95])
        
        buf = io.BytesIO()
        plt.savefig(buf, format='png')
        plt.close(fig)
        buf.seek(0)
        return f"data:image/png;base64,{base64.b64encode(buf.read()).decode('utf-8')}"

def main():
    try:
        payload = json.load(sys.stdin)
        data = pd.DataFrame(payload.get('data'))
        duration_col = payload.get('durationCol')
        event_col = payload.get('eventCol')
        group_col = payload.get('groupCol')
        covariates = payload.get('covariates', [])

        analyzer = SurvivalAnalyzer()
        analyzer.load_data(data, duration_col, event_col, group_col, covariates)
        analyzer.kaplan_meier()
        
        if covariates:
            analyzer.cox_regression()

        plot_image = analyzer.plot_all()

        response = {
            'results': analyzer.results,
            'plot': plot_image
        }

        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
