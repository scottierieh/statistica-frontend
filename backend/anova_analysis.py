import sys
import json
import pandas as pd
import pingouin as pg

def anova_analysis():
    try:
        # Read data from stdin
        input_data = sys.stdin.read()
        payload = json.loads(input_data)
        
        data = payload.get('data')
        independent_var = payload.get('independentVar')
        dependent_var = payload.get('dependentVar')

        if not all([data, independent_var, dependent_var]):
            print(json.dumps({"error": "Missing 'data', 'independentVar', or 'dependentVar'"}), file=sys.stderr)
            sys.exit(1)

        df = pd.DataFrame(data)
        
        # --- ANOVA Calculation ---
        anova_res = pg.anova(data=df, dv=dependent_var, between=independent_var, detailed=True)
        
        # --- Assumption Checks ---
        normality_res = pg.normality(data=df, dv=dependent_var, group=independent_var)
        homogeneity_res = pg.homoscedasticity(data=df, dv=dependent_var, group=independent_var)

        # --- Post-hoc (if significant) ---
        post_hoc = None
        is_significant = anova_res['p-unc'][0] < 0.05
        if is_significant:
            post_hoc = pg.pairwise_tukey(data=df, dv=dependent_var, between=independent_var)
        
        # --- Descriptive Statistics ---
        descriptives = df.groupby(independent_var)[dependent_var].agg(['count', 'mean', 'std', 'var', 'min', 'max', 'median', lambda x: x.quantile(0.25), lambda x: x.quantile(0.75), lambda x: x.sem()]).reset_index()
        descriptives.columns = ['group', 'n', 'mean', 'std', 'var', 'min', 'max', 'median', 'q1', 'q3', 'se']

        # --- Prepare Response ---
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
        print(json.dumps(response))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    anova_analysis()
