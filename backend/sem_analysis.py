
import sys
import json
import pandas as pd
import semopy
import numpy as np
import base64
import io
import networkx as nx
import matplotlib.pyplot as plt
import warnings

warnings.filterwarnings('ignore')

def _to_native_type(obj):
    if isinstance(obj, np.integer): return int(obj)
    if isinstance(obj, np.floating): return float(obj) if np.isfinite(obj) else None
    if isinstance(obj, np.ndarray): return obj.tolist()
    if isinstance(obj, (bool, np.bool_)): return bool(obj)
    return str(obj)

def generate_interpretation(results):
    fit = results.get('fit_indices', {})
    paths = results.get('structural_model', [])
    latents = results.get('measurement_model', {})
    
    key_insights = []

    # Model Fit
    cfi = fit.get('cfi')
    rmsea = fit.get('rmsea')
    srmr = fit.get('srmr')
    
    fit_summary = ""
    if cfi is not None and rmsea is not None and srmr is not None:
        if cfi >= 0.95 and rmsea <= 0.06 and srmr <= 0.08:
            fit_summary = "Excellent model fit, indicating the model aligns well with the data."
        elif cfi >= 0.90 and rmsea <= 0.08 and srmr <= 0.10:
            fit_summary = "Acceptable model fit, suggesting a reasonable approximation of the data."
        else:
            fit_summary = "Poor model fit, indicating the model may not accurately represent the relationships in the data."
    
    key_insights.append({"title": "Model Fit", "description": fit_summary})

    # Structural Paths
    sig_paths = [p for p in paths if p.get('significant') and not p.get('is_r_squared')]
    if sig_paths:
        strongest_path = max(sig_paths, key=lambda x: abs(x.get('estimate', 0)), default=None)
        if strongest_path:
            key_insights.append({
                "title": "Key Structural Path",
                "description": f"The strongest significant path is '{strongest_path['path']}', suggesting a powerful relationship between these variables (β = {strongest_path['estimate']:.3f})."
            })

    # Measurement Model
    low_alpha_factors = [name for name, data in latents.items() if data.get('cronbach_alpha', 1) < 0.7]
    if low_alpha_factors:
        key_insights.append({
            "title": "Measurement Concerns",
            "description": f"The latent variable(s) '{', '.join(low_alpha_factors)}' show(s) questionable internal consistency (Cronbach's α < 0.7), suggesting the indicators may not reliably measure the same construct."
        })

    # Overall
    overall = (
        f"The model explains the data { 'well' if fit_summary.startswith('Excellent') else 'acceptably' if fit_summary.startswith('Acceptable') else 'poorly'}. "
        f"{len(sig_paths)} out of {len(paths) - len([p for p in paths if p.get('is_r_squared')])} structural paths were significant. "
        f"{len(low_alpha_factors)} out of {len(latents)} latent variables showed potential reliability issues."
    )
    
    return {
        "key_insights": key_insights,
        "n_latent_vars": len(latents),
        "n_significant_paths": len(sig_paths),
        "overall_assessment": fit_summary
    }

def run_sem_analysis(data, model_spec, estimator='ML'):
    try:
        df_data = pd.DataFrame(data)

        if not model_spec or df_data.empty:
            raise ValueError("Missing model specification or data.")

        model = semopy.Model(model_spec)
        res = model.fit(df_data, obj=estimator)
        
        # --- Fit Indices ---
        stats = semopy.calc_stats(model, res)
        fit_indices = {
            "chi_square": stats.loc['chi2', 'Value'],
            "df": stats.loc['df', 'Value'],
            "p_value": stats.loc['p-value', 'Value'],
            "cfi": stats.loc['cfi', 'Value'],
            "tli": stats.loc['tli', 'Value'],
            "rmsea": stats.loc['rmsea', 'Value'],
            "srmr": stats.loc['srmr', 'Value'],
            "aic": stats.loc['aic', 'Value'],
            "bic": stats.loc['bic', 'Value'],
            "n": len(df_data)
        }

        # --- Coefficients ---
        estimates = semopy.inspect(model)
        
        measurement_model_raw = estimates[estimates['op'] == '=~']
        structural_model_raw = estimates[estimates['op'] == '~']
        
        # --- Measurement Model ---
        measurement_model = {}
        for factor in measurement_model_raw['lval'].unique():
            indicators = measurement_model_raw[measurement_model_raw['lval'] == factor]['rval'].tolist()
            loadings = dict(zip(indicators, measurement_model_raw[measurement_model_raw['lval'] == factor]['Estimate']))
            
            try:
                factor_data = df_data[indicators]
                n_items = len(indicators)
                item_variances = factor_data.var(ddof=1).sum()
                total_variance = factor_data.sum(axis=1).var(ddof=1)
                alpha = (n_items / (n_items - 1)) * (1 - item_variances / total_variance) if n_items > 1 and total_variance > 0 else 0
            except:
                alpha = np.nan

            measurement_model[factor] = {
                'indicators': indicators,
                'loadings': loadings,
                'cronbach_alpha': alpha
            }

        # --- Structural Model ---
        structural_model = []
        for _, row in structural_model_raw.iterrows():
            structural_model.append({
                'path': f"{row['lval']} ~ {row['rval']}",
                'from': row['rval'],
                'to': row['lval'],
                'estimate': row['Estimate'],
                'std_error': row['Std. Err'],
                't_value': row['z-value'],
                'p_value': row['p-value'],
                'significant': row['p-value'] < 0.05
            })
            
        dependent_vars = structural_model_raw['lval'].unique()
        for dv in dependent_vars:
            try:
                ss_res = np.sum((model.predict(df_data)[dv] - df_data[dv])**2)
                ss_tot = np.sum((df_data[dv] - df_data[dv].mean())**2)
                r2 = 1 - (ss_res / ss_tot) if ss_tot > 0 else 0
                structural_model.append({
                    'path': f"{dv} R²", 'estimate': r2, 'is_r_squared': True,
                    'from': '', 'to': dv, 'std_error': None, 't_value': None, 'p_value': None, 'significant': None
                })
            except Exception:
                continue

        # --- Visualization ---
        path_diagram_b64 = None
        try:
            # semopy.semplot can fail if graphviz is not installed system-wide
            g = semopy.semplot(model, "sem_plot.png", plot_stats=True)
            with open("sem_plot.png", "rb") as f:
                path_diagram_b64 = base64.b64encode(f.read()).decode('utf-8')
        except Exception:
            pass

        # --- Interpretation ---
        all_results = {
            "parsed_model": model.parse(),
            "measurement_model": measurement_model,
            "structural_model": structural_model,
            "fit_indices": fit_indices,
            "estimator": estimator,
            "n_observations": len(df_data)
        }
        all_results['interpretation'] = generate_interpretation(all_results)
        
        response = {
            **all_results,
            'path_diagram': path_diagram_b64,
        }

        return json.loads(json.dumps(response, default=_to_native_type))

    except Exception as e:
        raise e
