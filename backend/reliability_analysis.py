import sys
import json
import pandas as pd
import pingouin as pg
import numpy as np
import math
import matplotlib.pyplot as plt
import seaborn as sns
import io
import base64

def _to_native_type(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, (np.floating, float)):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, np.bool_):
        return bool(obj)
    return obj

def get_alpha_interpretation_level(alpha):
    if alpha >= 0.9: return 'Excellent'
    if alpha >= 0.8: return 'Good'
    if alpha >= 0.7: return 'Acceptable'
    if alpha >= 0.6: return 'Questionable'
    if alpha >= 0.5: return 'Poor'
    return 'Unacceptable'


def _generate_interpretation(results):
    """Generate detailed interpretation for reliability analysis in APA format."""
    
    interpretation_parts = []
    
    alpha = results['alpha']
    n_items = results['n_items']
    n_cases = results['n_cases']
    ci = results.get('confidence_interval', [None, None])
    sem = results.get('sem')
    item_stats = results.get('item_statistics', {})
    scale_stats = results.get('scale_statistics', {})
    
    alpha_if_deleted = item_stats.get('alpha_if_deleted', {})
    citc = item_stats.get('corrected_item_total_correlations', {})
    avg_inter_item = scale_stats.get('avg_inter_item_correlation', 0)
    
    alpha_level = get_alpha_interpretation_level(alpha)
    
    # --- Overall Assessment ---
    interpretation_parts.append("**Overall Assessment**")
    
    interpretation_parts.append(
        f"→ Internal consistency of the **{n_items}-item** scale was assessed using Cronbach's α (N = {n_cases})."
    )
    
    # CI reporting if available
    if ci[0] is not None and ci[1] is not None:
        interpretation_parts.append(
            f"→ **Cronbach's α = {alpha:.3f}**, 95% CI [{ci[0]:.3f}, {ci[1]:.3f}]."
        )
    else:
        interpretation_parts.append(
            f"→ **Cronbach's α = {alpha:.3f}**."
        )
    
    interpretation_parts.append(
        f"→ Reliability classification: **{alpha_level}** (George & Mallery, 2003 guidelines)."
    )
    
    # Overall verdict
    if alpha >= 0.8:
        interpretation_parts.append(
            "→ The scale demonstrates strong internal consistency suitable for research and applied use."
        )
    elif alpha >= 0.7:
        interpretation_parts.append(
            "→ The scale shows acceptable reliability for research purposes."
        )
    elif alpha >= 0.6:
        interpretation_parts.append(
            "→ Reliability is questionable; interpret results with caution and consider scale revision."
        )
    else:
        interpretation_parts.append(
            "→ Poor reliability indicates the items may not measure a coherent construct."
        )
    
    # --- Statistical Insights ---
    interpretation_parts.append("")
    interpretation_parts.append("**Statistical Insights**")
    
    # Inter-item correlation analysis
    if avg_inter_item is not None and not np.isnan(avg_inter_item):
        if avg_inter_item >= 0.4:
            iic_desc = "strong item coherence"
        elif avg_inter_item >= 0.2:
            iic_desc = "moderate item coherence"
        else:
            iic_desc = "weak item coherence (items may measure different constructs)"
        
        interpretation_parts.append(
            f"→ Average inter-item correlation: **r = {avg_inter_item:.3f}** - {iic_desc}."
        )
        
        if avg_inter_item > 0.5:
            interpretation_parts.append(
                "→ High inter-item correlation may indicate item redundancy; consider reducing similar items."
            )
    
    # SEM interpretation
    if sem is not None:
        interpretation_parts.append(
            f"→ Standard Error of Measurement (SEM) = {sem:.3f}, indicating measurement precision."
        )
    
    # Problematic items analysis
    items_to_remove = [item for item, new_alpha in alpha_if_deleted.items() 
                       if new_alpha > alpha and new_alpha - alpha > 0.01]
    
    low_citc_items = [item for item, corr in citc.items() if corr < 0.3]
    
    if items_to_remove:
        interpretation_parts.append("→ **Items potentially reducing reliability:**")
        for item in items_to_remove[:3]:  # Show top 3
            new_alpha = alpha_if_deleted[item]
            improvement = new_alpha - alpha
            interpretation_parts.append(
                f"  • {item}: removing would increase α to {new_alpha:.3f} (+{improvement:.3f})"
            )
    else:
        interpretation_parts.append(
            "→ No single item removal would substantially improve α (all items contribute positively)."
        )
    
    if low_citc_items:
        interpretation_parts.append(
            f"→ **Low item-total correlations** (r < .30): {', '.join(low_citc_items[:3])}."
        )
        interpretation_parts.append(
            "  • These items may not align well with the overall construct being measured."
        )
    
    # Sample adequacy
    ratio = n_cases / n_items if n_items > 0 else 0
    if ratio < 5:
        interpretation_parts.append(
            f"→ ⚠ Subject-to-item ratio ({ratio:.1f}:1) is below recommended minimum (5:1); α estimate may be unstable."
        )
    elif ratio < 10:
        interpretation_parts.append(
            f"→ Subject-to-item ratio ({ratio:.1f}:1) is adequate but larger samples would improve precision."
        )
    else:
        interpretation_parts.append(
            f"→ Subject-to-item ratio ({ratio:.1f}:1) provides stable α estimation."
        )
    
    # --- Recommendations ---
    interpretation_parts.append("")
    interpretation_parts.append("**Recommendations**")
    
    if alpha < 0.6:
        interpretation_parts.append(
            "→ **Major revision needed**: Review item wording, ensure all items target the same construct, "
            "and consider exploratory factor analysis to identify subscales."
        )
        interpretation_parts.append(
            "→ Check for reverse-coded items that may not have been properly recoded."
        )
        interpretation_parts.append(
            "→ Consider adding more items to increase scale length (α typically increases with more items)."
        )
    elif alpha < 0.7:
        interpretation_parts.append(
            "→ Consider revising or removing items with low item-total correlations (r < .30)."
        )
        interpretation_parts.append(
            "→ Review items flagged as improving α if deleted for potential removal or revision."
        )
        interpretation_parts.append(
            "→ Verify that all items are conceptually aligned with the target construct."
        )
    elif alpha < 0.8:
        interpretation_parts.append(
            "→ Acceptable for research; for high-stakes decisions, consider scale refinement."
        )
        if items_to_remove:
            interpretation_parts.append(
                f"→ Optional: Remove {items_to_remove[0]} to potentially improve reliability."
            )
        interpretation_parts.append(
            "→ Document reliability in publications using APA format: α = .XX, 95% CI [.XX, .XX]."
        )
    else:
        interpretation_parts.append(
            "→ Strong reliability achieved. Document using APA format in publications."
        )
        if alpha > 0.95:
            interpretation_parts.append(
                "→ Very high α (> .95) may suggest item redundancy; consider shortening the scale."
            )
        interpretation_parts.append(
            "→ Consider confirmatory factor analysis (CFA) to validate scale structure."
        )
        interpretation_parts.append(
            "→ For longitudinal studies, assess test-retest reliability as a complement to internal consistency."
        )
    
    # General recommendations
    interpretation_parts.append(
        "→ Report α alongside scale descriptives (M, SD) when publishing results."
    )
    
    if n_cases < 100:
        interpretation_parts.append(
            "→ Consider collecting additional data; samples of 100+ provide more stable α estimates."
        )
    
    return "\n".join(interpretation_parts)


def _create_reliability_plot(df_items, results):
    """Create visualization for reliability analysis."""
    
    sns.set_theme(style="whitegrid")
    fig, axes = plt.subplots(2, 2, figsize=(14, 12))
    fig.suptitle('Reliability Analysis Results', fontsize=16, fontweight='bold')
    
    item_stats = results['item_statistics']
    alpha = results['alpha']
    
    # 1. Item-Total Correlations Bar Plot
    citc = item_stats['corrected_item_total_correlations']
    items = list(citc.keys())
    correlations = list(citc.values())
    
    colors = ['#e74c3c' if c < 0.3 else '#3498db' for c in correlations]
    
    ax1 = axes[0, 0]
    bars = ax1.barh(items, correlations, color=colors)
    ax1.axvline(x=0.3, color='red', linestyle='--', linewidth=1.5, label='Threshold (r = 0.30)')
    ax1.set_xlabel('Corrected Item-Total Correlation', fontsize=11)
    ax1.set_ylabel('Items', fontsize=11)
    ax1.set_title('Item-Total Correlations', fontsize=12, fontweight='bold')
    ax1.legend(loc='lower right')
    ax1.set_xlim(0, max(1, max(correlations) + 0.1))
    
    # 2. Alpha if Item Deleted
    aid = item_stats['alpha_if_deleted']
    aid_items = list(aid.keys())
    aid_values = list(aid.values())
    
    colors_aid = ['#2ecc71' if v > alpha else '#3498db' for v in aid_values]
    
    ax2 = axes[0, 1]
    bars2 = ax2.barh(aid_items, aid_values, color=colors_aid)
    ax2.axvline(x=alpha, color='red', linestyle='--', linewidth=1.5, label=f'Current α = {alpha:.3f}')
    ax2.set_xlabel("Cronbach's α if Item Deleted", fontsize=11)
    ax2.set_ylabel('Items', fontsize=11)
    ax2.set_title('Alpha if Item Deleted', fontsize=12, fontweight='bold')
    ax2.legend(loc='lower right')
    ax2.set_xlim(min(aid_values) - 0.05, max(aid_values) + 0.05)
    
    # 3. Inter-Item Correlation Heatmap
    ax3 = axes[1, 0]
    corr_matrix = df_items.corr()
    mask = np.triu(np.ones_like(corr_matrix, dtype=bool), k=1)
    sns.heatmap(corr_matrix, mask=mask, annot=True, fmt='.2f', cmap='RdYlBu_r', 
                center=0, ax=ax3, square=True, linewidths=0.5,
                cbar_kws={'shrink': 0.8, 'label': 'Correlation'})
    ax3.set_title('Inter-Item Correlation Matrix', fontsize=12, fontweight='bold')
    
    # 4. Item Means with Error Bars (SD)
    ax4 = axes[1, 1]
    means = list(item_stats['means'].values())
    stds = list(item_stats['stds'].values())
    item_names = list(item_stats['means'].keys())
    
    x_pos = np.arange(len(item_names))
    ax4.bar(x_pos, means, yerr=stds, capsize=4, color='#3498db', alpha=0.7, edgecolor='#2980b9')
    ax4.set_xticks(x_pos)
    ax4.set_xticklabels(item_names, rotation=45, ha='right')
    ax4.set_xlabel('Items', fontsize=11)
    ax4.set_ylabel('Mean ± SD', fontsize=11)
    ax4.set_title('Item Descriptive Statistics', fontsize=12, fontweight='bold')
    
    # Add overall alpha annotation
    fig.text(0.5, 0.02, f"Overall Cronbach's α = {alpha:.3f} ({get_alpha_interpretation_level(alpha)})", 
             ha='center', fontsize=12, fontweight='bold',
             bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.5))
    
    plt.tight_layout(rect=[0, 0.05, 1, 0.95])
    
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=100, bbox_inches='tight')
    plt.close(fig)
    buf.seek(0)
    
    return base64.b64encode(buf.read()).decode('utf-8')


def main():
    try:
        input_data = json.load(sys.stdin)
        
        data = input_data.get('data')
        items = input_data.get('items')
        reverse_code_items = input_data.get('reverseCodeItems', [])

        if not data or not items:
            raise ValueError("Missing 'data' or 'items' in request")
        
        df = pd.DataFrame(data)

        all_cols = set(items)
        missing_cols = [col for col in all_cols if col not in df.columns]
        if missing_cols:
            raise ValueError(f"Columns not found in data: {', '.join(missing_cols)}")
            
        df_items = df[items].copy()

        for col in reverse_code_items:
            if col in df_items.columns:
                max_val = df_items[col].max()
                min_val = df_items[col].min()
                df_items[col] = max_val + min_val - df_items[col]
        
        df_items.dropna(inplace=True)
        if df_items.shape[0] < 2:
            raise ValueError("Not enough valid data for analysis after handling missing values.")

        alpha_results = pg.cronbach_alpha(data=df_items, nan_policy='listwise')
        
        # Manual calculation for item-total statistics
        total_score = df_items.sum(axis=1)
        
        corrected_item_total_correlations = {}
        alpha_if_deleted = {}

        for item in df_items.columns:
            item_score = df_items[item]
            rest_score = total_score - item_score
            correlation = pg.corr(item_score, rest_score)['r'].iloc[0]
            corrected_item_total_correlations[item] = correlation
            
            alpha_if_del = pg.cronbach_alpha(data=df_items.drop(columns=item))[0]
            alpha_if_deleted[item] = alpha_if_del

        sem_value = np.nan
        if alpha_results[0] >= 0:
            sem_value = df_items.sum(axis=1).std() * (1 - alpha_results[0])**0.5
        
        if math.isnan(sem_value):
            sem_value = None

        response = {
            'alpha': alpha_results[0],
            'n_items': df_items.shape[1],
            'n_cases': df_items.shape[0],
            'confidence_interval': list(alpha_results[1]),
            'sem': sem_value,
            'item_statistics': {
                'means': df_items.mean().to_dict(),
                'stds': df_items.std().to_dict(),
                'corrected_item_total_correlations': corrected_item_total_correlations,
                'alpha_if_deleted': alpha_if_deleted,
            },
            'scale_statistics': {
                'mean': total_score.mean(),
                'std': total_score.std(),
                'variance': total_score.var(),
                'avg_inter_item_correlation': df_items.corr().values[np.triu_indices_from(df_items.corr().values, k=1)].mean()
            },
        }
        
        response['interpretation'] = _generate_interpretation(response)
        
        # Generate plot
        plot_image = _create_reliability_plot(df_items, response)
        response['plot'] = f"data:image/png;base64,{plot_image}"
        
        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()