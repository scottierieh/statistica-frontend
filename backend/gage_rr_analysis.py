import sys
import json
import pandas as pd
import numpy as np
import statsmodels.api as sm
from statsmodels.formula.api import ols
import warnings

warnings.filterwarnings('ignore')

def _to_native_type(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, (np.floating, float)):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    return obj

def perform_gage_rr_anova(data, part_col, operator_col, measurement_col):
    """
    Performs Gage R&R analysis using ANOVA method.
    """
    # ANOVA model - Corrected formula for interaction term
    formula = f'Q("{measurement_col}") ~ C(Q("{part_col}")) + C(Q("{operator_col}")) + C(Q("{part_col}")):C(Q("{operator_col}"))'
    model = ols(formula, data=data).fit()
    anova_table = sm.stats.anova_lm(model, typ=2)
    
    # Calculate Mean Squares (MS = sum_sq / df)
    anova_table['MS'] = anova_table['sum_sq'] / anova_table['df']
    
    # Extract mean squares from ANOVA table
    ms_operator = anova_table.loc[f'C(Q("{operator_col}"))', 'MS']
    ms_part = anova_table.loc[f'C(Q("{part_col}"))', 'MS']
    ms_interaction = anova_table.loc[f'C(Q("{part_col}")):C(Q("{operator_col}"))', 'MS']
    ms_repeatability = anova_table.loc['Residual', 'MS']
    
    n_parts = data[part_col].nunique()
    n_operators = data[operator_col].nunique()
    n_replicates = data.groupby([part_col, operator_col]).size().iloc[0]

    # Calculate variance components
    var_repeatability = ms_repeatability
    var_operator = (ms_operator - ms_interaction) / (n_parts * n_replicates) if n_parts > 0 and n_replicates > 0 else 0
    var_interaction = (ms_interaction - ms_repeatability) / n_replicates if n_replicates > 0 else 0
    var_part = (ms_part - ms_interaction) / (n_operators * n_replicates) if n_operators > 0 and n_replicates > 0 else 0
    
    # Ensure variances are non-negative
    var_operator = max(0, var_operator)
    var_interaction = max(0, var_interaction)
    var_part = max(0, var_part)

    var_reproducibility = var_operator + var_interaction
    var_gage_rr = var_repeatability + var_reproducibility
    var_total = var_gage_rr + var_part
    
    if var_total == 0:
        raise ValueError("Total variation is zero. Cannot perform Gage R&R analysis.")
        
    # Calculate %Contribution
    pct_contribution = {
        'Repeatability': (var_repeatability / var_total) * 100,
        'Reproducibility': (var_reproducibility / var_total) * 100,
        'Operator': (var_operator / var_total) * 100,
        'Operator*Part': (var_interaction / var_total) * 100,
        'Total Gage R&R': (var_gage_rr / var_total) * 100,
        'Part-to-Part': (var_part / var_total) * 100,
    }
    
    # Calculate %Study Var (using std dev)
    std_repeatability = np.sqrt(var_repeatability)
    std_reproducibility = np.sqrt(var_reproducibility)
    std_gage_rr = np.sqrt(var_gage_rr)
    std_part = np.sqrt(var_part)
    std_total = np.sqrt(var_total)

    pct_study_var = {
        'Repeatability': (std_repeatability / std_total) * 100,
        'Reproducibility': (std_reproducibility / std_total) * 100,
        'Total Gage R&R': (std_gage_rr / std_total) * 100,
        'Part-to-Part': (std_part / std_total) * 100,
    }

    # Number of Distinct Categories (NDC)
    ndc = 1.41 * (std_part / std_gage_rr) if std_gage_rr > 0 else float('inf')
    
    gage_rr_metrics = {}
    for source in pct_contribution.keys():
        gage_rr_metrics[source] = {
            'contribution': pct_contribution.get(source, 0),
            'study_var': pct_study_var.get(source, 0)
        }
    
    gage_rr_metrics['NDC'] = { 'value': int(np.floor(ndc)) if np.isfinite(ndc) else 'inf' }
    
    return anova_table, gage_rr_metrics

def generate_interpretation(gage_rr_metrics):
    total_gage_rr_study_var = gage_rr_metrics.get('Total Gage R&R', {}).get('study_var', 100)
    ndc = gage_rr_metrics.get('NDC', {}).get('value', 0)
    
    interpretation = ""
    
    if total_gage_rr_study_var < 10:
        interp_text = f"**Excellent:** The measurement system variation is less than 10% ({total_gage_rr_study_var:.1f}%) of the total variation, indicating the system is acceptable."
    elif total_gage_rr_study_var < 30:
        interp_text = f"**Marginal:** The measurement system variation is between 10% and 30% ({total_gage_rr_study_var:.1f}%). It may be acceptable depending on the application and cost."
    else:
        interp_text = f"**Unacceptable:** The measurement system variation is greater than 30% ({total_gage_rr_study_var:.1f}%). The system needs significant improvement."

    if ndc >= 5:
        ndc_text = f"The Number of Distinct Categories (NDC) is {ndc}, which is >= 5. This indicates the measurement system can adequately distinguish between parts."
    else:
        ndc_text = f"The Number of Distinct Categories (NDC) is {ndc}, which is less than 5. This suggests the measurement system may not be able to effectively distinguish between different parts."
        
    interpretation = f"{interp_text}\n\n{ndc_text}"
    return interpretation

def main():
    try:
        payload = json.load(sys.stdin)
        data = payload.get('data')
        part_col = payload.get('part_col')
        operator_col = payload.get('operator_col')
        measurement_col = payload.get('measurement_col')

        if not all([data, part_col, operator_col, measurement_col]):
            raise ValueError("Missing data or required column names.")

        df = pd.DataFrame(data)
        
        # Ensure correct data types
        df[measurement_col] = pd.to_numeric(df[measurement_col], errors='coerce')
        df[part_col] = df[part_col].astype(str)
        df[operator_col] = df[operator_col].astype(str)
        df.dropna(inplace=True)

        if df.shape[0] < 15:
            raise ValueError("Not enough data for Gage R&R analysis. A minimum of 15 observations is recommended.")

        anova_table, gage_rr_metrics = perform_gage_rr_anova(df, part_col, operator_col, measurement_col)
        
        # Prepare anova_table for JSON output
        # Reset index to make the source names a column
        anova_df = anova_table.reset_index()
        anova_df.columns = ['Source', 'sum_sq', 'df', 'F', 'PR(>F)', 'MS']
        
        # Clean up Source names to be more readable
        def clean_source_name(source_name):
            """Convert statsmodels formula notation to readable names"""
            if 'Residual' in source_name:
                return 'Residual'
            
            # Extract column names from C(Q("...")) pattern
            import re
            
            # Check for interaction term
            if ':' in source_name:
                parts = source_name.split(':')
                cleaned_parts = []
                for part in parts:
                    match = re.search(r'Q\("([^"]+)"\)', part)
                    if match:
                        cleaned_parts.append(match.group(1))
                return ' × '.join(cleaned_parts)
            
            # Single factor
            match = re.search(r'Q\("([^"]+)"\)', source_name)
            if match:
                return match.group(1)
            
            return source_name
        
        anova_df['Source'] = anova_df['Source'].apply(clean_source_name)
        
        # Rename columns for clarity
        anova_df = anova_df.rename(columns={'PR(>F)': 'p-value'})
        
        # Convert to records
        anova_table_json = anova_df.to_dict('records')
        
        interpretation = generate_interpretation(gage_rr_metrics)
        
        response = {
            'results': {
                'anova_table': anova_table_json,
                'gage_rr_metrics': gage_rr_metrics,
                'interpretation': interpretation,
            }
        }
        
        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
    