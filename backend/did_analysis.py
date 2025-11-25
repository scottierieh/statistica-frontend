import sys
import json
import pandas as pd
import statsmodels.formula.api as smf
import statsmodels.api as sm
import re
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import io
import base64
import math
import warnings
warnings.filterwarnings('ignore')

def _to_native_type(obj):
    if isinstance(obj, (int, float, str, bool)) or obj is None:
        return obj
    if isinstance(obj, np.integer):
        return int(obj)
    if isinstance(obj, np.floating):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return float(obj)
    if hasattr(obj, 'item'):
        return obj.item()
    return str(obj)

def _generate_interpretation(model, did_effect_p_value, did_coefficient, group_var, time_var, outcome_var):
    """Generates an interpretation for the DiD results."""
    
    # Start with a general description
    interp = (
        f"A Difference-in-Differences (DiD) analysis was conducted to estimate the causal effect of the intervention "
        f"on the '{outcome_var}' by comparing the change over time between the treatment and control groups.\n\n"
    )

    # Interpret the key DiD effect
    did_sig_text = "statistically significant" if did_effect_p_value < 0.05 else "not statistically significant"
    direction = "increase" if did_coefficient > 0 else "decrease"
    
    interp += (
        f"The key finding is the interaction effect (DiD estimator), which was found to be **{did_sig_text}** "
        f"(coefficient = {did_coefficient:.4f}, p = {did_effect_p_value:.4f}).\n"
    )

    if did_effect_p_value < 0.05:
        interp += (
            f"This suggests that the intervention led to a statistically significant **{direction}** of approximately "
            f"**{abs(did_coefficient):.4f}** units in '{outcome_var}' for the treatment group compared to the control group, "
            f"after accounting for pre-existing differences and common time trends.\n\n"
        )
    else:
        interp += (
            f"This suggests that there is no statistical evidence to conclude that the intervention had a significant effect "
            f"on '{outcome_var}' for the treatment group relative to the control group.\n\n"
        )
        
    # Parallel Trends Assumption
    interp += (
        "**Assumption Check:** The validity of the DiD estimate relies on the **parallel trends assumption**, "
        "which states that the treatment and control groups would have followed similar trends in the absence of the intervention. "
        "This can be visually inspected from the interaction plot; if the lines are roughly parallel *before* the intervention (time=0), the assumption is more likely to hold."
    )
    
    return interp


def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        group_var_orig = payload.get('group_var')
        time_var_orig = payload.get('time_var')
        outcome_var_orig = payload.get('outcome_var')
        
        if not all([data, group_var_orig, time_var_orig, outcome_var_orig]):
            raise ValueError("Missing required parameters: data, group_var, time_var, or outcome_var")

        df = pd.DataFrame(data)

        # Convert group/time vars to numeric categories (0/1) for easier interpretation
        # Store original labels for plotting
        group_labels = df[group_var_orig].unique()
        time_labels = df[time_var_orig].unique()
        
        if len(group_labels) != 2 or len(time_labels) != 2:
             raise ValueError("Group and Time variables must each have exactly two unique values for DiD analysis.")

        df[group_var_orig] = pd.Categorical(df[group_var_orig])
        df[time_var_orig] = pd.Categorical(df[time_var_orig])

        group_map = {code: label for code, label in enumerate(df[group_var_orig].cat.categories)}
        time_map = {code: label for code, label in enumerate(df[time_var_orig].cat.categories)}

        df['group_encoded'] = df[group_var_orig].cat.codes
        df['time_encoded'] = df[time_var_orig].cat.codes
        
        group_var = 'group_encoded'
        time_var = 'time_encoded'
        outcome_var = outcome_var_orig


        df[outcome_var] = pd.to_numeric(df[outcome_var], errors='coerce')
        df_clean = df.dropna(subset=[outcome_var, group_var, time_var]).copy()
        
        if len(df_clean[group_var].unique()) != 2 or len(df_clean[time_var].unique()) != 2:
             raise ValueError("Group and Time variables must each have exactly two unique values for DiD analysis after cleaning.")

        formula = f'Q("{outcome_var}") ~ C(Q("{group_var}")) * C(Q("{time_var}"))'
        model = smf.ols(formula, data=df_clean).fit()
        
        # --- Plotting with ANOVA style ---
        sns.set_style("darkgrid")
        
        fig, ax = plt.subplots(figsize=(6, 5))
        
        # Use pointplot with updated styling to match ANOVA
        sns.pointplot(
            data=df_clean, 
            x=time_var, 
            y=outcome_var, 
            hue=group_var, 
            ax=ax, 
            dodge=True, 
            errorbar='ci', 
            capsize=0.1,
            markers=['o', 's'],
            linestyles=['-', '--'],
            markersize=8,
            linewidth=2,
            palette='crest'
        )
        
        ax.set_title('Difference-in-Differences Analysis', fontsize=14, fontweight='bold')
        ax.set_xlabel('Time Period', fontsize=11)
        ax.set_ylabel(f'Mean of {outcome_var_orig}', fontsize=11)
        
        # Customize ticks and legend
        ax.set_xticks([0, 1])
        ax.set_xticklabels([time_map.get(0, 'Pre'), time_map.get(1, 'Post')])
        
        handles, labels = ax.get_legend_handles_labels()
        ax.legend(
            handles, 
            [group_map.get(int(float(l)), l) for l in labels], 
            title=group_var_orig,
            loc='best',
            fontsize=10
        )

        ax.grid(True, linestyle='--', alpha=0.6)
        plt.tight_layout()
        
        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=100)
        plt.close(fig)
        buf.seek(0)
        plot_image = base64.b64encode(buf.read()).decode('utf-8')

        # --- Clean up coefficient names and add interpretation ---
        did_effect_key = f'C(Q("{group_var}"))[T.1]:C(Q("{time_var}"))[T.1]'
        did_coefficient = model.params.get(did_effect_key, 0)
        did_p_value = model.pvalues.get(did_effect_key, 1.0)

        interpretation = _generate_interpretation(
            model, did_p_value, did_coefficient,
            group_var_orig, time_var_orig, outcome_var_orig
        )

        # ✅ 변수명 정리 함수 (완전히 심플하게)
        def clean_var_name(name: str) -> str:
            if not isinstance(name, str):
                return str(name)
            
            original = name.strip()
            
            # Intercept는 그대로
            if original == 'Intercept':
                return 'Intercept'
            
            # DiD interaction (콜론이 있으면 interaction)
            if ':' in original:
                return 'DiD_Effect'
            
            # Group effect
            if group_var in original:
                return 'Group_Effect'
            
            # Time effect  
            if time_var in original:
                return 'Time_Effect'
            
            # 혹시 못 잡았을 경우 기본 정리
            return original

        # 모델 파라미터 및 p-value 이름 정리
        params_cleaned = {clean_var_name(k): _to_native_type(v) for k, v in model.params.to_dict().items()}
        pvalues_cleaned = {clean_var_name(k): _to_native_type(v) for k, v in model.pvalues.to_dict().items()}

        summary_obj = model.summary()
        summary_data = []

        for table in summary_obj.tables:
            table_data = [list(row) for row in table.data]

            # ✅ 불필요한 통계 줄 제거 (Omnibus, Skew, Kurtosis 등)
            joined_text = " ".join([str(cell) for row in table_data for cell in row])
            if re.search(r'Omnibus|Durbin|Jarque|Skew|Kurtosis|Cond\.', joined_text, re.IGNORECASE):
                continue

            # ✅ 계수 테이블의 변수명 정리
            if any("coef" in str(h).lower() for h in table_data[0]):
                for i in range(1, len(table_data)):
                    if table_data[i]:  # 빈 행이 아닌 경우만
                        table_data[i][0] = clean_var_name(table_data[i][0])

            summary_data.append({
                'caption': getattr(table, 'title', None),
                'data': table_data
            })

        # ✅ 최종 출력
        response = {
            'results': {
                'model_summary_data': summary_data,
                'params': params_cleaned,
                'pvalues': pvalues_cleaned,
                'rsquared': _to_native_type(model.rsquared),
                'rsquared_adj': _to_native_type(model.rsquared_adj),
                'interpretation': interpretation,
            },
            'plot': f"data:image/png;base64,{plot_image}"
        }

        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        error_response = {"error": str(e)}
        sys.stderr.write(json.dumps(error_response))
        sys.exit(1)

if __name__ == '__main__':
    main()
