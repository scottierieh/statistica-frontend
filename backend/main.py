from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import pingouin as pg
import json

app = Flask(__name__)
CORS(app)

@app.route("/reliability", methods=['POST'])
def reliability():
    try:
        payload = request.get_json()
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
                max_val = df_items[col].max()
                min_val = df_items[col].min()
                df_items[col] = max_val + min_val - df_items[col]
        
        df_items.dropna(inplace=True)
        if df_items.shape[0] < 2:
            return jsonify({"error": "Not enough valid data for analysis after handling missing values."}), 400

        alpha_results = pg.cronbach_alpha(data=df_items, nan_policy='listwise')
        
        item_stats = pg.multivariate_corr(df_items.sum(axis=1), df_items)

        alpha_if_deleted = {}
        for item in df_items.columns:
            sub_df = df_items.drop(columns=item)
            alpha_if_deleted[item] = pg.cronbach_alpha(data=sub_df)[0]
            
        inter_item_corrs = df_items.corr()
        avg_inter_item_corr = inter_item_corrs.values[inter_item_corrs.values != 1].mean()

        response = {
            'alpha': alpha_results[0],
            'n_items': df_items.shape[1],
            'n_cases': df_items.shape[0],
            'confidence_interval': list(alpha_results[1]),
            'sem': df_items.sum(axis=1).std() * (1 - alpha_results[0])**0.5,
            'item_statistics': {
                'means': df_items.mean().to_dict(),
                'stds': df_items.std().to_dict(),
                'corrected_item_total_correlations': item_stats['r'].to_dict(),
                'alpha_if_deleted': alpha_if_deleted,
            },
            'scale_statistics': {
                'mean': df_items.sum(axis=1).mean(),
                'std': df_items.sum(axis=1).std(),
                'variance': df_items.sum(axis=1).var(),
                'avg_inter_item_correlation': avg_inter_item_corr
            }
        }
        
        return jsonify(response)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/anova", methods=['POST'])
def anova():
    try:
        payload = request.get_json()
        data = payload.get('data')
        independent_var = payload.get('independentVar')
        dependent_var = payload.get('dependentVar')

        if not all([data, independent_var, dependent_var]):
            return jsonify({"error": "Missing 'data', 'independentVar', or 'dependentVar'"}), 400

        df = pd.DataFrame(data)
        
        anova_res = pg.anova(data=df, dv=dependent_var, between=independent_var, detailed=True)
        normality_res = pg.normality(data=df, dv=dependent_var, group=independent_var)
        homogeneity_res = pg.homoscedasticity(data=df, dv=dependent_var, group=independent_var)

        post_hoc = None
        is_significant = anova_res['p-unc'][0] < 0.05
        if is_significant:
            post_hoc = pg.pairwise_tukey(data=df, dv=dependent_var, between=independent_var)
        
        descriptives = df.groupby(independent_var)[dependent_var].agg(['count', 'mean', 'std', 'var', 'min', 'max', 'median', lambda x: x.quantile(0.25), lambda x: x.quantile(0.75), lambda x: x.sem()]).reset_index()
        descriptives.columns = ['group', 'n', 'mean', 'std', 'var', 'min', 'max', 'median', 'q1', 'q3', 'se']

        response = {
            "descriptives": {row['group']: row.to_dict() for _, row in descriptives.iterrows()},
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
                'omega_squared': pg.compute_effsize(df[independent_var], df[dependent_var], eftype='omega')
            },
            "assumptions": {
                "normality": {group: {'statistic': stat, 'p_value': p, 'normal': normal} for group, stat, p, normal in zip(normality_res['group'], normality_res['W'], normality_res['pval'], normality_res['normal'])},
                "homogeneity": {
                    'levene_statistic': homogeneity_res['W'][0],
                    'levene_p_value': homogeneity_res['pval'][0],
                    'equal_variances': homogeneity_res['equal_var'][0]
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

# This part is for local development if needed, but the app is served by the cloud environment.
if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=8080)