from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import pingouin as pg
from firebase_functions import https_fn

# Initialize Flask App
app = Flask(__name__)
CORS(app) # Enable CORS for all routes and origins

@app.route("/reliability", methods=['POST'])
def reliability():
    try:
        payload = request.get_json()
        if not payload:
            return jsonify({"error": "No JSON payload received"}), 400
            
        data = payload.get('data')
        items = payload.get('items')
        reverse_code_items = payload.get('reverseCodeItems', [])

        if not data or not items:
            return jsonify({"error": "Missing 'data' or 'items' in request"}), 400
        
        df = pd.DataFrame(data)

        all_cols = set(items)
        missing_cols = [col for col in all_cols if col not in df.columns]
        if missing_cols:
            return jsonify({"error": f"Columns not found in data: {', '.join(missing_cols)}"}), 400
            
        df_items = df[items].copy()

        for col in reverse_code_items:
            if col in df_items.columns:
                # Ensure column is numeric before performing arithmetic
                df_items[col] = pd.to_numeric(df_items[col], errors='coerce')
                max_val = df_items[col].max()
                min_val = df_items[col].min()
                df_items[col] = max_val + min_val - df_items[col]
        
        df_items.dropna(inplace=True)
        if df_items.shape[0] < 2:
            return jsonify({"error": "Not enough valid data for analysis after handling missing values."}), 400

        alpha_results = pg.cronbach_alpha(data=df_items)
        
        # pg.item_reliability might fail with few items, handle it gracefully
        item_total_corr = None
        if df_items.shape[1] > 2:
            try:
                item_total_corr = pg.item_reliability(df_items)
            except Exception:
                item_total_corr = None


        response = {
            'alpha': alpha_results[0],
            'n_items': df_items.shape[1],
            'n_cases': df_items.shape[0],
            'confidence_interval': list(alpha_results[1]),
            'sem': df_items.sum(axis=1).std(ddof=1) * (1 - alpha_results[0])**0.5 if alpha_results[0] is not None else None,
            'item_statistics': {
                'means': df_items.mean().to_dict(),
                'stds': df_items.std(ddof=1).to_dict(),
                'corrected_item_total_correlations': item_total_corr['item-total_corr'].to_dict() if item_total_corr is not None else {item: None for item in items},
                'alpha_if_deleted': item_total_corr['alpha_if_deleted'].to_dict() if item_total_corr is not None else {item: None for item in items},
            },
            'scale_statistics': {
                'mean': df_items.sum(axis=1).mean(),
                'std': df_items.sum(axis=1).std(ddof=1),
                'variance': df_items.sum(axis=1).var(ddof=1),
                'avg_inter_item_correlation': df_items.corr().values[df_items.corr().values != 1].mean()
            }
        }
        
        return jsonify(response)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/anova", methods=['POST'])
def anova():
    try:
        payload = request.get_json()
        if not payload:
            return jsonify({"error": "No JSON payload received"}), 400

        data = payload.get('data')
        independent_var = payload.get('independentVar')
        dependent_var = payload.get('dependentVar')

        if not all([data, independent_var, dependent_var]):
            return jsonify({"error": "Missing 'data', 'independentVar', or 'dependentVar'"}), 400

        df = pd.DataFrame(data)
        
        df[dependent_var] = pd.to_numeric(df[dependent_var], errors='coerce')
        df[independent_var] = df[independent_var].astype('category')
        df.dropna(subset=[dependent_var, independent_var], inplace=True)

        if df.shape[0] < 2:
            return jsonify({"error": "Not enough valid data points for analysis."}), 400
        
        if df[independent_var].nunique() < 2:
            return jsonify({"error": f"The independent variable '{independent_var}' must have at least 2 unique groups."}), 400

        anova_res = pg.anova(data=df, dv=dependent_var, between=independent_var, detailed=True)
        normality_res = pg.normality(data=df, dv=dependent_var, group=independent_var)
        homogeneity_res = pg.homoscedasticity(data=df, dv=dependent_var, group=independent_var)

        post_hoc = None
        is_significant = anova_res['p-unc'][0] < 0.05
        if is_significant and df[independent_var].nunique() > 2:
            post_hoc = pg.pairwise_tukey(data=df, dv=dependent_var, between=independent_var)
        
        descriptives = df.groupby(independent_var)[dependent_var].agg(['count', 'mean', 'std', 'var', 'min', 'max', 'median', lambda x: x.quantile(0.25), lambda x: x.quantile(0.75), 'sem']).reset_index()
        descriptives.columns = ['group', 'n', 'mean', 'std', 'var', 'min', 'max', 'median', 'q1', 'q3', 'se']

        response = {
            "descriptives": {str(row['group']): row.drop('group').to_dict() for _, row in descriptives.iterrows()},
            "anova": {
                'f_statistic': anova_res['F'][0],
                'p_value': anova_res['p-unc'][0],
                'significant': is_significant,
                'ssb': anova_res['SS'][0],
                'ssw': anova_res['SS'][1],
                'sst': anova_res['SS'][0] + anova_res['SS'][1],
                'df_between': int(anova_res['DF'][0]),
                'df_within': int(anova_res['DF'][1]),
                'df_total': int(anova_res['DF'][0] + anova_res['DF'][1]),
                'msb': anova_res['MS'][0],
                'msw': anova_res['MS'][1],
                'eta_squared': anova_res['np2'][0],
                'omega_squared': pg.compute_effsize(df[independent_var], df[dependent_var], eftype='omega') if anova_res['np2'][0] is not None else None,
            },
            "assumptions": {
                "normality": {str(group): {'statistic': stat, 'p_value': p, 'normal': normal} for group, stat, p, normal in zip(normality_res['group'], normality_res['W'], normality_res['pval'], normality_res['normal'])},
                "homogeneity": {
                    'levene_statistic': homogeneity_res['W'][0],
                    'levene_p_value': homogeneity_res['pval'][0],
                    'equal_variances': bool(homogeneity_res['equal_var'][0])
                }
            },
            "post_hoc_tukey": post_hoc.to_dict('records') if post_hoc is not None else [],
            "effect_size_interpretation": {
                "eta_squared_interpretation": "Large effect" if anova_res['np2'][0] >= 0.14 else "Medium effect" if anova_res['np2'][0] >= 0.06 else "Small effect"
            }
        }
        return jsonify(response)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# This is the entry point for the Google Cloud Function.
# It dispatches requests to the Flask app.
@https_fn.on_request()
def api(req: https_fn.Request) -> https_fn.Response:
    with app.request_context(req.environ):
        return app.full_dispatch_request()
