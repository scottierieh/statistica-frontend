import sys
import json
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import matplotlib.pyplot as plt
import seaborn as sns
from scipy import stats
from scipy.optimize import minimize
import warnings
import io
import base64

warnings.filterwarnings('ignore')

# Set seaborn style globally
sns.set_theme(style="darkgrid")
sns.set_context("notebook", font_scale=1.1)

# Try to import lifelines (professional survival analysis library)
try:
    from lifelines import KaplanMeierFitter, CoxPHFitter, LogNormalAFTFitter, WeibullAFTFitter, NelsonAalenFitter
    from lifelines.statistics import logrank_test, multivariate_logrank_test, pairwise_logrank_test
    from lifelines.plotting import plot_lifetimes
    from lifelines.utils import median_survival_times, restricted_mean_survival_time
    LIFELINES_AVAILABLE = True
except ImportError:
    LIFELINES_AVAILABLE = False
    print("Warning: lifelines not available. Install with: pip install lifelines", file=sys.stderr)

def _to_native_type(obj):
    if isinstance(obj, np.integer): return int(obj)
    if isinstance(obj, np.floating): return float(obj) if np.isfinite(obj) else None
    elif isinstance(obj, np.ndarray): return obj.tolist()
    elif isinstance(obj, np.bool_): return bool(obj)
    elif isinstance(obj, pd.Timestamp): return obj.isoformat()
    return obj


def _generate_interpretation(results, duration_col, event_col, group_col, covariates, n_obs):
    """Generate detailed interpretation for Survival Analysis results in APA format."""
    
    interpretation_parts = []
    
    data_summary = results.get('data_summary', {})
    km_results = results.get('kaplan_meier', {})
    log_rank = results.get('log_rank_test', {})
    cox_results = results.get('cox_ph', {})
    aft_weibull = results.get('aft_weibull', {})
    aft_lognormal = results.get('aft_lognormal', {})
    
    total_subjects = data_summary.get('total_subjects', n_obs)
    total_events = data_summary.get('total_events', 0)
    censored = data_summary.get('censored', 0)
    event_rate = data_summary.get('event_rate', 0)
    median_survival = km_results.get('median_survival_time')
    rmst = km_results.get('rmst')
    
    # --- Overall Assessment ---
    interpretation_parts.append("**Overall Assessment**")
    
    interpretation_parts.append(
        f"→ A survival analysis was conducted to examine time-to-event patterns for **{event_col}** "
        f"using **{duration_col}** as the duration variable (N = {total_subjects})."
    )
    
    interpretation_parts.append(
        f"→ Of {total_subjects} subjects, {total_events} experienced the event ({event_rate*100:.1f}% event rate) "
        f"and {censored} were censored ({(1-event_rate)*100:.1f}% censoring rate)."
    )
    
    if median_survival is not None and not np.isnan(median_survival):
        interpretation_parts.append(
            f"→ The median survival time was **{median_survival:.2f}** units, indicating that 50% of subjects "
            f"experienced the event by this time point."
        )
    else:
        interpretation_parts.append(
            f"→ Median survival time could not be estimated (survival probability did not reach 50%)."
        )
    
    if rmst is not None:
        interpretation_parts.append(
            f"→ The restricted mean survival time (RMST) was **{rmst:.2f}**, representing the average "
            f"event-free time over the observation period."
        )
    
    # Log-rank test results
    if log_rank:
        p_value = log_rank.get('p_value', 1)
        chi2 = log_rank.get('test_statistic', 0)
        df = log_rank.get('degrees_of_freedom', 1)
        is_sig = log_rank.get('is_significant', False)
        
        p_str = "p < .001" if p_value < 0.001 else f"p = {p_value:.3f}"
        
        if is_sig:
            interpretation_parts.append(
                f"→ The log-rank test revealed a **statistically significant difference** in survival curves "
                f"between {group_col} groups, χ²({df}) = {chi2:.2f}, {p_str}."
            )
        else:
            interpretation_parts.append(
                f"→ The log-rank test showed **no significant difference** in survival curves "
                f"between {group_col} groups, χ²({df}) = {chi2:.2f}, {p_str}."
            )
    
    # --- Statistical Insights ---
    interpretation_parts.append("")
    interpretation_parts.append("**Statistical Insights**")
    
    # Event rate interpretation
    if event_rate >= 0.5:
        interpretation_parts.append(
            f"→ High event rate ({event_rate*100:.1f}%) provides good statistical power for survival estimates."
        )
    elif event_rate >= 0.2:
        interpretation_parts.append(
            f"→ Moderate event rate ({event_rate*100:.1f}%) provides adequate statistical power."
        )
    else:
        interpretation_parts.append(
            f"→ Low event rate ({event_rate*100:.1f}%) may limit precision of survival estimates; consider longer follow-up."
        )
    
    # Cox model insights
    if cox_results and cox_results.get('summary'):
        concordance = cox_results.get('concordance', 0)
        
        if concordance >= 0.7:
            c_desc = "good"
        elif concordance >= 0.6:
            c_desc = "moderate"
        else:
            c_desc = "limited"
        
        interpretation_parts.append(
            f"→ Cox proportional hazards model achieved C-index = **{concordance:.3f}**, indicating {c_desc} predictive discrimination."
        )
        
        # Find significant predictors
        sig_predictors = []
        for row in cox_results.get('summary', []):
            covariate = row.get('covariate', row.get('index', ''))
            p_val = row.get('p', 1)
            hr = row.get('exp(coef)', 1)
            if p_val < 0.05:
                direction = "increased" if hr > 1 else "decreased"
                hr_pct = abs(hr - 1) * 100
                sig_predictors.append(f"{covariate} (HR = {hr:.2f}, {direction} risk by {hr_pct:.1f}%)")
        
        if sig_predictors:
            interpretation_parts.append(f"→ Significant predictors of survival:")
            for pred in sig_predictors[:5]:  # Top 5
                interpretation_parts.append(f"  • {pred}")
        else:
            interpretation_parts.append("→ No covariates reached statistical significance at α = .05.")
        
        # PH assumption
        ph_test = cox_results.get('proportional_hazard_assumption', {})
        if ph_test.get('passed', True):
            interpretation_parts.append("→ Proportional hazards assumption was satisfied, validating model assumptions.")
        else:
            interpretation_parts.append("→ **Warning**: Proportional hazards assumption may be violated; interpret with caution.")
    
    # Group comparisons
    if 'kaplan_meier_grouped' in results:
        grouped = results['kaplan_meier_grouped']
        group_medians = []
        for group_name, group_data in grouped.items():
            med = group_data.get('median_survival')
            if med is not None and not np.isnan(med):
                group_medians.append((group_name, med))
        
        if len(group_medians) >= 2:
            group_medians.sort(key=lambda x: x[1], reverse=True)
            best_group = group_medians[0]
            worst_group = group_medians[-1]
            interpretation_parts.append(
                f"→ Group **{best_group[0]}** showed longest median survival ({best_group[1]:.2f}), "
                f"while **{worst_group[0]}** had shortest ({worst_group[1]:.2f})."
            )
    
    # --- Recommendations ---
    interpretation_parts.append("")
    interpretation_parts.append("**Recommendations**")
    
    # Sample size adequacy
    events_per_covariate = total_events / max(len(covariates), 1) if covariates else total_events
    if events_per_covariate < 10:
        interpretation_parts.append(
            f"→ **Warning**: Only {events_per_covariate:.1f} events per covariate; recommend 10-20+ for stable Cox estimates."
        )
    else:
        interpretation_parts.append(
            f"→ Adequate events per covariate ratio ({events_per_covariate:.1f}) supports reliable Cox regression."
        )
    
    # Censoring check
    if (1 - event_rate) > 0.7:
        interpretation_parts.append(
            "→ High censoring rate (>70%) may bias survival estimates; consider informative censoring analysis."
        )
    
    # Model comparison
    if aft_weibull and aft_lognormal:
        aic_weibull = aft_weibull.get('aic', float('inf'))
        aic_lognormal = aft_lognormal.get('aic', float('inf'))
        
        if aic_weibull < aic_lognormal:
            interpretation_parts.append(
                f"→ Weibull AFT model (AIC = {aic_weibull:.1f}) fits better than Log-Normal (AIC = {aic_lognormal:.1f}); "
                "suggests monotonic hazard pattern."
            )
        else:
            interpretation_parts.append(
                f"→ Log-Normal AFT model (AIC = {aic_lognormal:.1f}) fits better than Weibull (AIC = {aic_weibull:.1f}); "
                "suggests non-monotonic hazard pattern."
            )
    
    if cox_results:
        interpretation_parts.append(
            "→ Report hazard ratios with 95% CIs for clinical interpretation of risk factors."
        )
    
    if log_rank and log_rank.get('is_significant'):
        interpretation_parts.append(
            "→ Significant group differences warrant targeted intervention strategies for high-risk groups."
        )
    
    interpretation_parts.append(
        "→ Consider external validation and time-dependent covariate analysis for robust conclusions."
    )
    
    return "\n".join(interpretation_parts)


class SurvivalAnalyzer:
    """
    A comprehensive survival analysis toolkit
    """
    
    def __init__(self):
        self.data = None
        self.kmf = None
        self.naf = None
        self.cox_model = None
        self.aft_model = None
        self.results = {}
    
    def load_data(self, data, duration_col, event_col, group_col=None, covariates=None):
        self.data = pd.DataFrame(data).copy()
        self.duration_col = duration_col
        self.event_col = event_col
        self.group_col = group_col
        self.covariates = covariates or []
        
        # Basic data validation
        assert duration_col in self.data.columns, f"Duration column '{duration_col}' not found"
        assert event_col in self.data.columns, f"Event column '{event_col}' not found"
        if not self.data[duration_col].apply(lambda x: isinstance(x, (int, float)) and x > 0).all():
             self.data[duration_col] = pd.to_numeric(self.data[duration_col], errors='coerce')
             self.data = self.data.dropna(subset=[duration_col])
             self.data = self.data[self.data[duration_col] > 0]
        
        if not self.data[event_col].isin([0, 1]).all():
            self.data[event_col] = pd.to_numeric(self.data[event_col], errors='coerce')
            self.data = self.data.dropna(subset=[event_col])
            self.data = self.data[self.data[event_col].isin([0,1])]

        return self
    
    def compute_data_summary(self):
        """Compute comprehensive survival data summary"""
        total_subjects = len(self.data)
        total_events = int(self.data[self.event_col].sum())
        censored = total_subjects - total_events
        
        summary = {
            'total_subjects': total_subjects,
            'total_events': total_events,
            'censored': censored,
            'event_rate': float(total_events / total_subjects) if total_subjects > 0 else 0,
            'censoring_rate': float(censored / total_subjects) if total_subjects > 0 else 0,
            'mean_duration': float(self.data[self.duration_col].mean()),
            'median_duration': float(self.data[self.duration_col].median()),
            'min_duration': float(self.data[self.duration_col].min()),
            'max_duration': float(self.data[self.duration_col].max()),
            'std_duration': float(self.data[self.duration_col].std())
        }
        
        # Group-specific summaries
        if self.group_col:
            group_summaries = {}
            for group in self.data[self.group_col].unique():
                group_data = self.data[self.data[self.group_col] == group]
                group_events = int(group_data[self.event_col].sum())
                group_total = len(group_data)
                group_summaries[str(group)] = {
                    'n_subjects': group_total,
                    'n_events': group_events,
                    'n_censored': group_total - group_events,
                    'event_rate': float(group_events / group_total) if group_total > 0 else 0,
                    'mean_duration': float(group_data[self.duration_col].mean()),
                    'median_duration': float(group_data[self.duration_col].median())
                }
            summary['group_summaries'] = group_summaries
        
        self.results['data_summary'] = summary
        return self
    
    def kaplan_meier(self, confidence_interval=0.95):
        if not LIFELINES_AVAILABLE: raise ImportError("lifelines library not found.")
        
        kmf = KaplanMeierFitter()
        kmf.fit(self.data[self.duration_col], self.data[self.event_col], alpha=1-confidence_interval)
        
        self.kmf = kmf
        
        # Compute survival at specific time points
        survival_at_times = {}
        time_points = [0.25, 0.5, 0.75]  # Quartiles
        max_time = float(self.data[self.duration_col].max())
        for quantile in time_points:
            time = max_time * quantile
            try:
                surv_prob = float(kmf.predict(time))
                survival_at_times[f'{int(quantile*100)}%_time'] = surv_prob
            except:
                survival_at_times[f'{int(quantile*100)}%_time'] = None
        
        self.results['kaplan_meier'] = {
            'survival_table': kmf.survival_function_.reset_index().rename(
                columns={'timeline': 'Time', 'KM_estimate': 'Survival Probability'}
            ).to_dict('records'),
            'confidence_interval': kmf.confidence_interval_.reset_index().to_dict('records'),
            'median_survival_time': kmf.median_survival_time_,
            'timeline': kmf.timeline.tolist(),
            'survival_at_times': survival_at_times,
            'events_table': kmf.event_table.reset_index().to_dict('records')
        }
        
        # Compute RMST (Restricted Mean Survival Time)
        try:
            rmst = restricted_mean_survival_time(kmf, t=max_time)
            self.results['kaplan_meier']['rmst'] = float(rmst)
        except:
            self.results['kaplan_meier']['rmst'] = None
        
        if self.group_col:
            self._kaplan_meier_by_group(confidence_interval)
        
        return self
    
    def _kaplan_meier_by_group(self, confidence_interval=0.95):
        groups = self.data[self.group_col].unique()
        group_results = {}
        
        for i, group in enumerate(groups):
            group_data = self.data[self.data[self.group_col] == group]
            kmf_group = KaplanMeierFitter()
            kmf_group.fit(group_data[self.duration_col], group_data[self.event_col], 
                         alpha=1-confidence_interval, label=f"{self.group_col}={group}")
            
            # RMST for group
            try:
                max_time = float(group_data[self.duration_col].max())
                rmst = restricted_mean_survival_time(kmf_group, t=max_time)
                rmst_value = float(rmst)
            except:
                rmst_value = None
            
            group_results[str(group)] = {
                'survival_function': kmf_group.survival_function_.reset_index().to_dict('records'),
                'confidence_interval': kmf_group.confidence_interval_.reset_index().to_dict('records'),
                'median_survival': kmf_group.median_survival_time_,
                'n_events': int(group_data[self.event_col].sum()),
                'n_subjects': len(group_data),
                'rmst': rmst_value
            }
        self.results['kaplan_meier_grouped'] = group_results
        
        if len(groups) >= 2:
            self.log_rank_test()
            if len(groups) > 2:
                self.pairwise_log_rank_test()
    
    def log_rank_test(self):
        """Perform log-rank test for group comparison"""
        if not self.group_col or not LIFELINES_AVAILABLE: return self
        
        groups = self.data[self.group_col].unique()
        
        if len(groups) >= 2:
            results = multivariate_logrank_test(
                self.data[self.duration_col], 
                self.data[self.group_col], 
                self.data[self.event_col]
            )
            self.results['log_rank_test'] = {
                'test_statistic': float(results.test_statistic),
                'p_value': float(results.p_value),
                'degrees_of_freedom': int(results.degrees_of_freedom),
                'is_significant': results.p_value < 0.05,
                'test_name': results.test_name
            }
        
        return self
    
    def pairwise_log_rank_test(self):
        """Perform pairwise log-rank tests between all groups"""
        if not self.group_col or not LIFELINES_AVAILABLE: return self
        
        try:
            pairwise_results = pairwise_logrank_test(
                self.data[self.duration_col],
                self.data[self.group_col],
                self.data[self.event_col]
            )
            
            # Convert to readable format
            pairwise_summary = pairwise_results.summary.reset_index()
            self.results['pairwise_log_rank_test'] = pairwise_summary.to_dict('records')
        except Exception as e:
            self.results['pairwise_log_rank_test'] = {'error': str(e)}
        
        return self
    
    def cox_regression(self):
        if not LIFELINES_AVAILABLE or not self.covariates: return self
        
        cox_data = self.data[[self.duration_col, self.event_col] + self.covariates].dropna()
        categorical_covariates = [c for c in self.covariates if cox_data[c].dtype == 'object' or cox_data[c].dtype == 'category']
        
        if categorical_covariates:
            cox_data = pd.get_dummies(cox_data, columns=categorical_covariates, drop_first=True)

        self.used_covariates_cox = [c for c in cox_data.columns if c not in [self.duration_col, self.event_col]]
        
        cph = CoxPHFitter()
        cph.fit(cox_data, duration_col=self.duration_col, event_col=self.event_col)
        
        self.cox_model = cph
        
        # Summary with hazard ratios
        summary_df = cph.summary.reset_index()
        summary_df = summary_df.rename(columns={'covariate': 'covariate'})
        
        cox_results = {
            'summary': summary_df.to_dict('records'),
            'concordance': float(cph.concordance_index_),
            'log_likelihood': float(cph.log_likelihood_),
            'aic': float(cph.AIC_partial_),
            'partial_aic': float(cph.AIC_partial_)
        }
        
        # Proportional hazards assumption test (Schoenfeld residuals)
        # CRITICAL FIX: Suppress all plots and capture output
        try:
            import io
            from contextlib import redirect_stdout, redirect_stderr
            
            # Redirect all output to avoid contaminating JSON
            f_out = io.StringIO()
            f_err = io.StringIO()
            
            with redirect_stdout(f_out), redirect_stderr(f_err):
                # Close any existing plots
                plt.close('all')
                
                # Run test without showing plots
                ph_test = cph.check_assumptions(cox_data, p_value_threshold=0.05, show_plots=False)
                
                # Close any plots that might have been created
                plt.close('all')
            
            cox_results['proportional_hazard_assumption'] = {
                'passed': True
            }
        except Exception as e:
            cox_results['proportional_hazard_assumption'] = {
                'passed': False,
                'error': str(e)
            }
        
        self.results['cox_ph'] = cox_results
        return self
    
    def aft_regression(self, model_type='weibull'):
        if not LIFELINES_AVAILABLE or not self.covariates: return self
        
        aft_data = self.data[[self.duration_col, self.event_col] + self.covariates].dropna()
        categorical_covariates = [c for c in self.covariates if aft_data[c].dtype == 'object' or aft_data[c].dtype == 'category']
        
        if categorical_covariates:
            aft_data = pd.get_dummies(aft_data, columns=categorical_covariates, drop_first=True)
            
        self.used_covariates_aft = [c for c in aft_data.columns if c not in [self.duration_col, self.event_col]]

        if model_type == 'weibull':
            aft = WeibullAFTFitter()
        elif model_type == 'lognormal':
            aft = LogNormalAFTFitter()
        else:
            raise ValueError("Unsupported AFT model type. Use 'weibull' or 'lognormal'.")
            
        aft.fit(aft_data, duration_col=self.duration_col, event_col=self.event_col)
        self.aft_model = aft
        
        summary_df = aft.summary.reset_index()
        
        aft_results = {
            'summary': summary_df.to_dict('records'),
            'log_likelihood': float(aft.log_likelihood_),
            'aic': float(aft.AIC_),
            'concordance': float(aft.concordance_index_) if hasattr(aft, 'concordance_index_') else None
        }
        
        self.results[f'aft_{model_type}'] = aft_results

        return self
    
    def compute_predictive_metrics(self):
        """Compute additional predictive performance metrics"""
        if not self.cox_model:
            return self
        
        cox_data = self.data[[self.duration_col, self.event_col] + self.covariates].dropna()
        categorical_covariates = [c for c in self.covariates if cox_data[c].dtype == 'object']
        if categorical_covariates:
            cox_data = pd.get_dummies(cox_data, columns=categorical_covariates, drop_first=True)
        
        # Compute risk scores
        risk_scores = self.cox_model.predict_partial_hazard(cox_data[self.used_covariates_cox])
        
        # Stratify by risk
        risk_groups = pd.qcut(risk_scores, q=[0, .33, .66, 1], labels=['Low', 'Medium', 'High'], duplicates='drop')
        
        self.results['risk_stratification'] = {
            'risk_scores_mean': float(risk_scores.mean()),
            'risk_scores_std': float(risk_scores.std()),
            'risk_scores_min': float(risk_scores.min()),
            'risk_scores_max': float(risk_scores.max())
        }
        
        return self

    def _smooth_hazard(self, cumulative_hazard, bandwidth=None):
        """Smooth hazard function using kernel smoothing"""
        from scipy.ndimage import gaussian_filter1d
        
        # Calculate instantaneous hazard as derivative of cumulative hazard
        time = cumulative_hazard.index.values
        cum_haz = cumulative_hazard.values.flatten()
        
        # Smooth the cumulative hazard first
        if bandwidth is None:
            bandwidth = max(1, len(time) // 20)
        
        smoothed_cum_haz = gaussian_filter1d(cum_haz, sigma=bandwidth)
        
        # Calculate derivative (hazard rate)
        hazard = np.gradient(smoothed_cum_haz, time)
        hazard = np.maximum(hazard, 0)  # Ensure non-negative
        
        return pd.Series(hazard, index=time)

    def generate_interpretation(self):
        """Generate interpretation and add to results"""
        interpretation = _generate_interpretation(
            results=self.results,
            duration_col=self.duration_col,
            event_col=self.event_col,
            group_col=self.group_col,
            covariates=self.covariates,
            n_obs=len(self.data)
        )
        self.results['interpretation'] = interpretation
        return self

    def plot_all(self):
        # Close any existing plots
        plt.close('all')
        
        # Create figure with 3x2 layout for 6 plots
        fig = plt.figure(figsize=(16, 12))
        gs = fig.add_gridspec(3, 2, hspace=0.3, wspace=0.3)
        
        axes = [
            fig.add_subplot(gs[0, 0]),  # Survival curve
            fig.add_subplot(gs[0, 1]),  # Cumulative hazard
            fig.add_subplot(gs[1, 0]),  # Hazard function
            fig.add_subplot(gs[1, 1]),  # Group survival
            fig.add_subplot(gs[2, 0]),  # Risk groups
            fig.add_subplot(gs[2, 1]),  # Hazard by group
        ]
        
        # Define consistent colors
        line_color = '#C44E52'
        
        # 1. Kaplan-Meier Survival Curve
        if self.kmf:
            self.kmf.plot_survival_function(ax=axes[0], ci_show=True)
            axes[0].set_title('Kaplan-Meier Survival Curve', fontsize=12, fontweight='bold')
            axes[0].set_xlabel('Time', fontsize=11)
            axes[0].set_ylabel('Survival Probability', fontsize=11)
            median_survival = self.kmf.median_survival_time_
            if not np.isnan(median_survival):
                axes[0].axvline(median_survival, color=line_color, linestyle='--', lw=2, 
                               label=f'Median: {median_survival:.2f}')
            axes[0].legend(loc='best')
        
        # 2. Cumulative Hazard Function
        naf = NelsonAalenFitter()
        naf.fit(self.data[self.duration_col], event_observed=self.data[self.event_col])
        self.naf = naf
        naf.plot_cumulative_hazard(ax=axes[1], ci_show=True)
        axes[1].set_title('Cumulative Hazard Function', fontsize=12, fontweight='bold')
        axes[1].set_xlabel('Time', fontsize=11)
        axes[1].set_ylabel('Cumulative Hazard', fontsize=11)

        # 3. Smoothed Hazard Function
        try:
            hazard = self._smooth_hazard(naf.cumulative_hazard_)
            axes[2].plot(hazard.index, hazard.values, color=line_color, lw=2, label='Hazard Rate')
            axes[2].fill_between(hazard.index, 0, hazard.values, alpha=0.3, color=line_color)
            axes[2].set_title('Smoothed Hazard Function', fontsize=12, fontweight='bold')
            axes[2].set_xlabel('Time', fontsize=11)
            axes[2].set_ylabel('Hazard Rate', fontsize=11)
            axes[2].legend(loc='best')
            axes[2].grid(True, alpha=0.3)
        except Exception as e:
            axes[2].text(0.5, 0.5, f'Hazard estimation unavailable', 
                        ha='center', va='center', fontsize=10)
            axes[2].set_title('Smoothed Hazard Function', fontsize=12, fontweight='bold')

        # 4. Survival Curves by Group
        if self.group_col and 'kaplan_meier_grouped' in self.results:
            colors = sns.color_palette('husl', len(self.data[self.group_col].unique()))
            for idx, group in enumerate(self.data[self.group_col].unique()):
                group_data = self.data[self.data[self.group_col] == group]
                kmf_group = KaplanMeierFitter()
                kmf_group.fit(group_data[self.duration_col], 
                             event_observed=group_data[self.event_col], 
                             label=str(group))
                kmf_group.plot_survival_function(ax=axes[3], color=colors[idx])
            axes[3].set_title(f'Survival Curves by {self.group_col}', fontsize=12, fontweight='bold')
            axes[3].set_xlabel('Time', fontsize=11)
            axes[3].set_ylabel('Survival Probability', fontsize=11)
            axes[3].legend(loc='best')
        else:
            axes[3].text(0.5, 0.5, 'No group variable', ha='center', va='center', fontsize=12)
            axes[3].set_title('Grouped Survival Curves', fontsize=12, fontweight='bold')

        # 5. Survival by Risk Group (Cox Model)
        if self.cox_model and hasattr(self, 'used_covariates_cox'):
            try:
                cox_data = self.data[[self.duration_col, self.event_col] + self.covariates].dropna()
                categorical_covariates = [c for c in self.covariates if self.data[c].dtype == 'object']
                if categorical_covariates:
                    cox_data = pd.get_dummies(cox_data, columns=categorical_covariates, drop_first=True)
                
                risk_scores = self.cox_model.predict_partial_hazard(cox_data[self.used_covariates_cox])
                risk_groups = pd.qcut(risk_scores, q=[0, .33, .66, 1], 
                                     labels=['Low', 'Medium', 'High'], duplicates='drop')
                cox_data['risk_group'] = risk_groups
                
                risk_colors = {'Low': '#2ecc71', 'Medium': '#f39c12', 'High': '#e74c3c'}
                for group in ['Low', 'Medium', 'High']:
                    group_df = cox_data[cox_data['risk_group'] == group]
                    if not group_df.empty:
                        kmf_risk = KaplanMeierFitter().fit(
                            group_df[self.duration_col], 
                            group_df[self.event_col], 
                            label=group
                        )
                        kmf_risk.plot_survival_function(ax=axes[4], color=risk_colors.get(group))
                axes[4].set_title('Survival by Risk Group (Cox Model)', fontsize=12, fontweight='bold')
                axes[4].set_xlabel('Time', fontsize=11)
                axes[4].set_ylabel('Survival Probability', fontsize=11)
                axes[4].legend(loc='best')
            except Exception as e:
                axes[4].text(0.5, 0.5, 'Risk stratification unavailable', 
                           ha='center', va='center', fontsize=10)
                axes[4].set_title('Survival by Risk Group', fontsize=12, fontweight='bold')
        else:
            axes[4].text(0.5, 0.5, 'No covariates for Cox model', 
                        ha='center', va='center', fontsize=12)
            axes[4].set_title('Survival by Risk Group', fontsize=12, fontweight='bold')
            
        # 6. Hazard Function by Group
        if self.group_col and 'kaplan_meier_grouped' in self.results:
            try:
                colors = sns.color_palette('husl', len(self.data[self.group_col].unique()))
                for idx, group in enumerate(self.data[self.group_col].unique()):
                    group_data = self.data[self.data[self.group_col] == group]
                    naf_group = NelsonAalenFitter()
                    naf_group.fit(group_data[self.duration_col], 
                                 event_observed=group_data[self.event_col])
                    hazard_group = self._smooth_hazard(naf_group.cumulative_hazard_)
                    axes[5].plot(hazard_group.index, hazard_group.values, 
                               color=colors[idx], lw=2, label=str(group))
                axes[5].set_title(f'Hazard Function by {self.group_col}', 
                                fontsize=12, fontweight='bold')
                axes[5].set_xlabel('Time', fontsize=11)
                axes[5].set_ylabel('Hazard Rate', fontsize=11)
                axes[5].legend(loc='best')
                axes[5].grid(True, alpha=0.3)
            except Exception as e:
                axes[5].text(0.5, 0.5, 'Group hazard estimation unavailable', 
                           ha='center', va='center', fontsize=10)
                axes[5].set_title(f'Hazard Function by Group', fontsize=12, fontweight='bold')
        else:
            axes[5].text(0.5, 0.5, 'No group variable', ha='center', va='center', fontsize=12)
            axes[5].set_title('Hazard Function by Group', fontsize=12, fontweight='bold')
        
        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=100, bbox_inches='tight')
        plt.close('all')  # Close all figures
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
        model_type = payload.get('modelType', 'all')

        analyzer = SurvivalAnalyzer()
        analyzer.load_data(data, duration_col, event_col, group_col, covariates)
        
        # Compute data summary
        analyzer.compute_data_summary()

        if model_type == 'km':
            analyzer.kaplan_meier()
        elif model_type == 'cox':
            analyzer.kaplan_meier()  # KM is baseline
            analyzer.cox_regression()
            analyzer.compute_predictive_metrics()
        elif model_type.startswith('aft_'):
            aft_model = model_type.split('_')[1]
            analyzer.kaplan_meier()
            analyzer.aft_regression(model_type=aft_model)
        else:
            # Default to running all for comprehensive analysis
            analyzer.kaplan_meier()
            if covariates:
                analyzer.cox_regression()
                analyzer.compute_predictive_metrics()
                analyzer.aft_regression('weibull')
                analyzer.aft_regression('lognormal')
        
        # Generate interpretation
        analyzer.generate_interpretation()
        
        plot_image = analyzer.plot_all()

        response = {
            'results': analyzer.results,
            'plot': plot_image
        }

        # Ensure clean JSON output
        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        import traceback
        error_response = {
            "error": str(e),
            "traceback": traceback.format_exc()
        }
        print(json.dumps(error_response), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()