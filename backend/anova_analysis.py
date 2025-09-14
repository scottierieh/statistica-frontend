
import sys
import json
import pandas as pd
import pingouin as pg

def main():
    try:
        payload = json.load(sys.stdin)
        
        data = payload.get('data')
        independent_var = payload.get('independentVar')
        dependent_var = payload.get('dependentVar')

        if not all([data, independent_var, dependent_var]):
            raise ValueError("Missing 'data', 'independentVar', or 'dependentVar'")

        df = pd.DataFrame(data)
        
        df[dependent_var] = pd.to_numeric(df[dependent_var], errors='coerce')
        df[independent_var] = df[independent_var].astype('category')
        df.dropna(subset=[dependent_var, independent_var], inplace=True)

        if df.shape[0] < 2:
            raise ValueError("Not enough valid data points for analysis.")
        
        if df[independent_var].nunique() < 2:
            raise ValueError(f"The independent variable '{independent_var}' must have at least 2 unique groups.")

        anova_res = pg.anova(data=df, dv=dependent_var, between=independent_var, detailed=True)
        normality_res = pg.normality(data=df, dv=dependent_var, group=independent_var)
        homogeneity_res = pg.homoscedasticity(data=df, dv=dependent_var, group=independent_var)

        post_hoc = None
        is_significant = anova_res['p-unc'][0] < 0.05
        if is_significant and df[independent_var].nunique() > 2:
            post_hoc = pg.pairwise_tukey(data=df, dv=dependent_var, between=independent_var)
        
        descriptives = df.groupby(independent_var)[dependent_var].agg(['count', 'mean', 'std', 'var', 'min', 'max', 'median', lambda x: x.quantile(0.25), lambda x: x.quantile(0.75), 'sem']).reset_index()
        descriptives.columns = ['group', 'n', 'mean', 'std', 'var', 'min', 'max', 'median', 'q1', 'q3', 'se']
        
        # Calculate omega squared manually if possible, or rely on eta-squared
        # omega_squared = (SSb - (DFb * MSW)) / (SST + MSW)
        ssb = anova_res['SS'][0]
        ssw = anova_res['SS'][1]
        dfb = anova_res['DF'][0]
        msw = anova_res['MS'][1]
        sst = ssb + ssw
        
        omega_squared_val = (ssb - (dfb * msw)) / (sst + msw) if (sst + msw) != 0 else 0


        response = {
            "descriptives": {str(row['group']): row.drop('group').to_dict() for _, row in descriptives.iterrows()},
            "anova": {
                'f_statistic': anova_res['F'][0],
                'p_value': anova_res['p-unc'][0],
                'significant': is_significant,
                'ssb': ssb,
                'ssw': ssw,
                'sst': sst,
                'df_between': int(dfb),
                'df_within': int(anova_res['DF'][1]),
                'df_total': int(dfb + anova_res['DF'][1]),
                'msb': anova_res['MS'][0],
                'msw': msw,
                'eta_squared': anova_res['np2'][0],

                'omega_squared': omega_squared_val
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
        print(json.dumps(response))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()

