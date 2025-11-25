import sys
import json
import numpy as np
import pandas as pd
import warnings
import math
import re

try:
    import statsmodels.api as sm
    import statsmodels.formula.api as smf
    STATSMODELS_AVAILABLE = True
except ImportError:
    STATSMODELS_AVAILABLE = False

warnings.filterwarnings('ignore')

def _to_native_type(obj):
    if isinstance(obj, (int, np.integer)):
        return int(obj)
    if isinstance(obj, (float, np.floating)):
        if math.isinf(obj) or math.isnan(obj):
            return None
        return float(obj)
    if isinstance(obj, np.ndarray):
        return [_to_native_type(item) for item in obj]
    if isinstance(obj, np.bool_):
        return bool(obj)
    return obj

def clean_json_inf(o):
    """
    Recursively cleans a data structure to make it JSON compliant,
    converting inf and nan to None.
    """
    if isinstance(o, list):
        return [clean_json_inf(v) for v in o]
    if isinstance(o, tuple):
        return tuple(clean_json_inf(v) for v in o)
    if isinstance(o, dict):
        return {k: clean_json_inf(v) for k, v in o.items()}
    return _to_native_type(o)


def _generate_interpretation(family, link_function, pseudo_r2, aic, bic, coefficients, target_var, n_obs, n_features):
    """Generate detailed interpretation for GLM results in APA format."""
    
    interpretation_parts = []
    
    # Count significant coefficients
    sig_coeffs = [c for c in coefficients if c['p_value'] < 0.05]
    n_significant = len(sig_coeffs)
    
    # Family-specific descriptions
    family_descriptions = {
        'gaussian': 'linear regression (Gaussian family with identity link)',
        'binomial': f'logistic regression (Binomial family with {link_function or "logit"} link)',
        'poisson': 'Poisson regression for count data',
        'gamma': 'Gamma regression for positive continuous outcomes'
    }
    
    # Effect size interpretation for pseudo R²
    if pseudo_r2 >= 0.26:
        effect_size = "large"
    elif pseudo_r2 >= 0.13:
        effect_size = "medium"
    elif pseudo_r2 >= 0.02:
        effect_size = "small"
    else:
        effect_size = "negligible"
    
    # --- Overall Assessment (APA Format) ---
    interpretation_parts.append("**Overall Assessment**")
    
    model_desc = family_descriptions.get(family, f'{family} GLM')
    interpretation_parts.append(
        f"→ A generalized linear model using {model_desc} was fitted to predict {target_var} "
        f"from {n_features} predictor(s) (N = {n_obs})."
    )
    
    interpretation_parts.append(
        f"→ The model achieved a pseudo R² = {pseudo_r2:.4f}, representing a {effect_size} effect size, "
        f"with AIC = {aic:.2f} and BIC = {bic:.2f}."
    )
    
    interpretation_parts.append(
        f"→ Of the {len(coefficients)} coefficients tested (including intercept), "
        f"{n_significant} were statistically significant at α = .05."
    )
    
    # Top significant predictors
    if sig_coeffs:
        # Sort by absolute coefficient value (excluding intercept)
        non_intercept_sig = [c for c in sig_coeffs if 'Intercept' not in c['variable'] and 'const' not in c['variable'].lower()]
        if non_intercept_sig:
            top_sig = sorted(non_intercept_sig, key=lambda x: abs(x['coefficient']), reverse=True)[0]
            interpretation_parts.append(
                f"→ The strongest significant predictor was {top_sig['variable']} "
                f"(b = {top_sig['coefficient']:.4f}, p < .05)."
            )
    
    # --- Statistical Insights ---
    interpretation_parts.append("")
    interpretation_parts.append("**Statistical Insights**")
    
    # Family-specific interpretation
    if family == 'binomial':
        interpretation_parts.append("→ Coefficient interpretation (logistic regression):")
        for c in sig_coeffs[:3]:  # Top 3 significant
            if 'Intercept' not in c['variable'] and c.get('exp_coefficient'):
                or_val = c['exp_coefficient']
                direction = "increases" if or_val > 1 else "decreases"
                pct_change = abs(or_val - 1) * 100
                interpretation_parts.append(
                    f"  • {c['variable']}: OR = {or_val:.3f} — each unit increase {direction} odds by {pct_change:.1f}%"
                )
    elif family == 'poisson':
        interpretation_parts.append("→ Coefficient interpretation (Poisson regression):")
        for c in sig_coeffs[:3]:
            if 'Intercept' not in c['variable']:
                rate_ratio = np.exp(c['coefficient'])
                direction = "increases" if rate_ratio > 1 else "decreases"
                pct_change = abs(rate_ratio - 1) * 100
                interpretation_parts.append(
                    f"  • {c['variable']}: Rate ratio = {rate_ratio:.3f} — each unit increase {direction} count by {pct_change:.1f}%"
                )
    else:
        interpretation_parts.append("→ Coefficient interpretation (linear scale):")
        for c in sig_coeffs[:3]:
            if 'Intercept' not in c['variable']:
                direction = "positive" if c['coefficient'] > 0 else "negative"
                interpretation_parts.append(
                    f"  • {c['variable']}: b = {c['coefficient']:.4f} ({direction} effect on {target_var})"
                )
    
    # Model comparison criteria
    interpretation_parts.append(f"→ Model fit indices: AIC = {aic:.2f}, BIC = {bic:.2f}")
    interpretation_parts.append("  • Lower AIC/BIC values indicate better model fit when comparing models")
    interpretation_parts.append(f"  • BIC penalizes complexity more heavily (BIC - AIC = {bic - aic:.2f})")
    
    # Sample size adequacy
    events_per_variable = n_obs / n_features if n_features > 0 else n_obs
    if events_per_variable < 10:
        interpretation_parts.append(
            f"→ Warning: Only {events_per_variable:.1f} observations per predictor (recommended: 10-20+). "
            f"Consider reducing predictors or increasing sample size."
        )
    elif events_per_variable < 20:
        interpretation_parts.append(
            f"→ Sample size is adequate with {events_per_variable:.1f} observations per predictor."
        )
    else:
        interpretation_parts.append(
            f"→ Good sample size with {events_per_variable:.1f} observations per predictor."
        )
    
    # --- Recommendations ---
    interpretation_parts.append("")
    interpretation_parts.append("**Recommendations**")
    
    if pseudo_r2 < 0.1:
        interpretation_parts.append(
            "→ Low pseudo R² suggests limited predictive power. Consider adding theoretically relevant predictors."
        )
    elif pseudo_r2 > 0.5:
        interpretation_parts.append(
            "→ High pseudo R² indicates strong predictive power. Check for potential overfitting or data leakage."
        )
    else:
        interpretation_parts.append(
            "→ Moderate pseudo R² is typical for observational data. Model appears reasonably specified."
        )
    
    # Non-significant predictors
    non_sig = [c for c in coefficients if c['p_value'] >= 0.05 and 'Intercept' not in c['variable']]
    if n_features > 0 and len(non_sig) > n_features / 2:
        interpretation_parts.append(
            f"→ Many predictors ({len(non_sig)}) are not significant. Consider model simplification for parsimony."
        )
    
    if family == 'binomial':
        interpretation_parts.append(
            "→ For logistic regression, report odds ratios (Exp(Coef)) with 95% CIs for publication."
        )
        interpretation_parts.append(
            "→ Consider assessing model calibration (Hosmer-Lemeshow test) and discrimination (ROC/AUC)."
        )
    elif family == 'poisson':
        interpretation_parts.append(
            "→ For Poisson regression, check for overdispersion. If present, consider negative binomial model."
        )
    
    interpretation_parts.append(
        "→ Examine residual plots and influence diagnostics to assess model assumptions."
    )
    
    return "\n".join(interpretation_parts)


def main():
    if not STATSMODELS_AVAILABLE:
        print(json.dumps({"error": "Statsmodels library not found. Please ensure it is installed in the backend environment."}), file=sys.stderr)
        sys.exit(1)

    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        target_var = payload.get('target_var')
        features = payload.get('features')
        family_name = payload.get('family', 'gaussian').lower()
        link_function_name = payload.get('link_function')

        if not all([data, target_var, features]):
            raise ValueError("Missing 'data', 'target_var', or 'features'")

        df = pd.DataFrame(data)
        
        # Map original names to sanitized names
        original_to_sanitized = {col: re.sub(r'[^A-Za-z0-9_]', '_', col) for col in df.columns}
        sanitized_to_original = {v: k for k, v in original_to_sanitized.items()}
        
        df_clean = df.rename(columns=original_to_sanitized)

        target_var_clean = original_to_sanitized.get(target_var, target_var)
        features_clean = [original_to_sanitized.get(f, f) for f in features]
        
        formula = f'Q("{target_var_clean}") ~ ' + ' + '.join([f'Q("{f}")' for f in features_clean])

        link_map = {
            'logit': sm.families.links.logit(),
            'probit': sm.families.links.probit(),
            'log': sm.families.links.log(),
            'inverse_power': sm.families.links.inverse_power(),
        }
        link = link_map.get(link_function_name) if link_function_name else None

        family_map = {
            'gaussian': sm.families.Gaussian(link=link),
            'binomial': sm.families.Binomial(link=link),
            'poisson': sm.families.Poisson(link=link),
            'gamma': sm.families.Gamma(link=link if link else sm.families.links.log()),
        }

        if family_name not in family_map:
            raise ValueError(f"Unsupported family: {family_name}. Supported families are: {list(family_map.keys())}")
        
        family = family_map[family_name]

        model = smf.glm(formula, data=df_clean, family=family)
        result = model.fit()
        
        def clean_sm_name(name):
            name = name.strip()
            # Regex for Q("...") or C(Q("..."))
            match = re.search(r'Q\("([^"]+)"\)', name)
            if match:
                sanitized_name = match.group(1)
                return sanitized_to_original.get(sanitized_name, sanitized_name)
            return name

        summary_obj = result.summary()
        summary_data = []
        for table in summary_obj.tables:
            caption = None
            if hasattr(table, 'title') and table.title:
                caption = table.title
            
            table_data = [list(row) for row in table.data]
            if table_data:
                 if len(table_data) > 1 and any('coef' in h.lower() for h in table_data[0]):
                    for row in table_data[1:]:
                        if row and row[0]:
                             row[0] = clean_sm_name(row[0])

            summary_data.append({ 'caption': caption, 'data': table_data })
        
        pseudo_r2 = 1 - (result.deviance / result.null_deviance) if result.null_deviance > 0 else 0

        params = result.params
        conf_int = result.conf_int()
        pvalues = result.pvalues

        coefficients_data = []
        
        is_exp = family_name in ['binomial', 'poisson', 'gamma']

        for param_name in params.index:
            cleaned_name = clean_sm_name(param_name)
            
            row = {
                'variable': cleaned_name,
                'coefficient': params[param_name],
                'p_value': pvalues[param_name],
                'conf_int_lower': conf_int.loc[param_name, 0],
                'conf_int_upper': conf_int.loc[param_name, 1],
            }

            if is_exp:
                try:
                    exp_coef = np.exp(params[param_name])
                    exp_ci = np.exp(conf_int.loc[param_name])
                    row['exp_coefficient'] = exp_coef
                    row['exp_conf_int_lower'] = exp_ci[0]
                    row['exp_conf_int_upper'] = exp_ci[1]
                except (OverflowError, ValueError):
                    row['exp_coefficient'] = None
                    row['exp_conf_int_lower'] = None
                    row['exp_conf_int_upper'] = None

            coefficients_data.append(row)

        # Generate interpretation
        interpretation = _generate_interpretation(
            family=family_name,
            link_function=link_function_name,
            pseudo_r2=pseudo_r2,
            aic=result.aic,
            bic=result.bic,
            coefficients=coefficients_data,
            target_var=target_var,
            n_obs=len(df),
            n_features=len(features)
        )

        final_result = {
            'model_summary_data': summary_data,
            'aic': result.aic,
            'bic': result.bic,
            'log_likelihood': result.llf,
            'deviance': result.deviance,
            'pseudo_r2': pseudo_r2,
            'coefficients': coefficients_data,
            'family': family_name,
            'interpretation': interpretation,
        }

        cleaned_result = clean_json_inf(final_result)
        
        print(json.dumps(cleaned_result))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
    