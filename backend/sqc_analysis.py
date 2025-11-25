import sys
import json
import numpy as np
import pandas as pd
import warnings

warnings.filterwarnings('ignore')

def _to_native_type(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    return obj

# Control Chart Constants (for sample sizes 2 to 25)
CONTROL_CHART_CONSTANTS = {
    'n': [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25],
    'A2': [1.880, 1.023, 0.729, 0.577, 0.483, 0.419, 0.373, 0.337, 0.308, 0.285, 0.266, 0.249, 0.235, 0.223, 0.212, 0.203, 0.194, 0.187, 0.180, 0.173, 0.167, 0.162, 0.157, 0.153],
    'A3': [2.659, 1.954, 1.628, 1.427, 1.287, 1.182, 1.099, 1.032, 0.975, 0.927, 0.886, 0.850, 0.817, 0.789, 0.763, 0.739, 0.718, 0.698, 0.680, 0.663, 0.647, 0.633, 0.619, 0.606],
    'd2': [1.128, 1.693, 2.059, 2.326, 2.534, 2.704, 2.847, 2.970, 3.078, 3.173, 3.258, 3.336, 3.407, 3.472, 3.532, 3.588, 3.640, 3.689, 3.735, 3.778, 3.819, 3.858, 3.895, 3.931],
    'D3': [0, 0, 0, 0, 0, 0.076, 0.136, 0.184, 0.223, 0.256, 0.283, 0.307, 0.328, 0.347, 0.363, 0.378, 0.391, 0.403, 0.415, 0.425, 0.434, 0.443, 0.451, 0.459],
    'D4': [3.267, 2.574, 2.282, 2.114, 2.004, 1.924, 1.864, 1.816, 1.777, 1.744, 1.717, 1.693, 1.672, 1.653, 1.637, 1.622, 1.608, 1.597, 1.585, 1.575, 1.566, 1.557, 1.548, 1.541],
    'c4': [0.7979, 0.8862, 0.9213, 0.9400, 0.9515, 0.9594, 0.9650, 0.9693, 0.9727, 0.9754, 0.9776, 0.9794, 0.9810, 0.9823, 0.9835, 0.9845, 0.9854, 0.9862, 0.9869, 0.9876, 0.9882, 0.9887, 0.9892, 0.9896],
    'B3': [0, 0, 0, 0, 0.030, 0.118, 0.185, 0.239, 0.284, 0.321, 0.354, 0.382, 0.406, 0.428, 0.448, 0.466, 0.482, 0.497, 0.510, 0.523, 0.534, 0.545, 0.555, 0.565],
    'B4': [3.267, 2.568, 2.266, 2.089, 1.970, 1.882, 1.815, 1.761, 1.716, 1.679, 1.646, 1.618, 1.594, 1.572, 1.552, 1.534, 1.518, 1.503, 1.490, 1.477, 1.466, 1.455, 1.445, 1.435]
}

CONSTANTS_DF = pd.DataFrame(CONTROL_CHART_CONSTANTS).set_index('n')

def _get_constants(n):
    """Get control chart constants for subgroup size n."""
    if n in CONSTANTS_DF.index:
        return CONSTANTS_DF.loc[n]
    return None

def detect_western_electric_rules(data, ucl, lcl, cl):
    """
    Detect violations using Western Electric Rules (advanced control chart rules).
    """
    violations = []
    n = len(data)
    
    # Rule 1: Any point beyond control limits
    for i, point in enumerate(data):
        if point > ucl or point < lcl:
            violations.append({
                'index': i + 1,
                'value': float(point),
                'rule': 'Rule 1: Point beyond control limits',
                'severity': 'critical'
            })
    
    # Rule 2: 9 consecutive points on same side of center line
    if n >= 9:
        for i in range(n - 8):
            segment = data[i:i+9]
            if all(x > cl for x in segment):
                violations.append({
                    'index': i + 1,
                    'value': float(data[i]),
                    'rule': 'Rule 2: 9+ consecutive points above center',
                    'severity': 'warning'
                })
                break
            elif all(x < cl for x in segment):
                violations.append({
                    'index': i + 1,
                    'value': float(data[i]),
                    'rule': 'Rule 2: 9+ consecutive points below center',
                    'severity': 'warning'
                })
                break
    
    # Rule 3: 6 consecutive points increasing or decreasing
    if n >= 6:
        for i in range(n - 5):
            segment = data[i:i+6]
            if all(segment[j] < segment[j+1] for j in range(5)):
                violations.append({
                    'index': i + 1,
                    'value': float(data[i]),
                    'rule': 'Rule 3: 6+ consecutive points trending up',
                    'severity': 'warning'
                })
            elif all(segment[j] > segment[j+1] for j in range(5)):
                violations.append({
                    'index': i + 1,
                    'value': float(data[i]),
                    'rule': 'Rule 3: 6+ consecutive points trending down',
                    'severity': 'warning'
                })
    
    # Rule 4: 14 consecutive points alternating up and down
    if n >= 14:
        for i in range(n - 13):
            segment = data[i:i+14]
            alternating = all(
                (segment[j] < segment[j+1] and segment[j+1] > segment[j+2]) or
                (segment[j] > segment[j+1] and segment[j+1] < segment[j+2])
                for j in range(12)
            )
            if alternating:
                violations.append({
                    'index': i + 1,
                    'value': float(data[i]),
                    'rule': 'Rule 4: 14+ consecutive alternating points',
                    'severity': 'info'
                })
                break
    
    # Rule 5: 2 out of 3 consecutive points beyond 2-sigma
    sigma = (ucl - cl) / 3
    upper_2sigma = cl + 2 * sigma
    lower_2sigma = cl - 2 * sigma
    
    if n >= 3:
        for i in range(n - 2):
            segment = data[i:i+3]
            beyond_2sigma = sum(1 for x in segment if x > upper_2sigma or x < lower_2sigma)
            if beyond_2sigma >= 2:
                violations.append({
                    'index': i + 1,
                    'value': float(data[i]),
                    'rule': 'Rule 5: 2/3 points beyond 2-sigma limits',
                    'severity': 'warning'
                })
    
    return violations

def calculate_process_performance(data):
    """Calculate process performance metrics."""
    mean = np.mean(data)
    std = np.std(data, ddof=1)
    median = np.median(data)
    
    return {
        'mean': float(mean),
        'median': float(median),
        'std_dev': float(std),
        'min': float(np.min(data)),
        'max': float(np.max(data)),
        'range': float(np.max(data) - np.min(data)),
        'cv': float((std / mean * 100) if mean != 0 else 0)  # Coefficient of variation
    }

def calculate_xbar_r_chart(df_subgroups):
    """Calculate X-bar and R chart limits."""
    n = df_subgroups.shape[1]
    constants = _get_constants(n)
    if constants is None:
        raise ValueError(f"No constants available for subgroup size n={n}")
    
    x_bar = df_subgroups.mean(axis=1)
    ranges = df_subgroups.max(axis=1) - df_subgroups.min(axis=1)
    r_bar = ranges.mean()
    x_double_bar = x_bar.mean()
    
    # X-bar chart limits
    ucl_x = x_double_bar + constants['A2'] * r_bar
    lcl_x = x_double_bar - constants['A2'] * r_bar
    
    # R chart limits
    ucl_r = constants['D4'] * r_bar
    lcl_r = constants['D3'] * r_bar
    
    # Calculate sigma zones for X-bar chart
    sigma = (ucl_x - x_double_bar) / 3
    
    return {
        'x_chart': {
            'ucl': float(ucl_x),
            'lcl': float(lcl_x),
            'cl': float(x_double_bar),
            'sigma': float(sigma),
            'ucl_1sigma': float(x_double_bar + sigma),
            'lcl_1sigma': float(x_double_bar - sigma),
            'ucl_2sigma': float(x_double_bar + 2 * sigma),
            'lcl_2sigma': float(x_double_bar - 2 * sigma)
        },
        'r_chart': {
            'ucl': float(ucl_r),
            'lcl': float(lcl_r),
            'cl': float(r_bar)
        },
        'data': {
            'x_bar': x_bar.tolist(),
            'r': ranges.tolist(),
            'subgroups': list(range(1, len(x_bar) + 1))
        },
        'subgroup_size': n
    }

def calculate_xbar_s_chart(df_subgroups):
    """Calculate X-bar and S chart limits."""
    n = df_subgroups.shape[1]
    constants = _get_constants(n)
    if constants is None:
        raise ValueError(f"No constants available for subgroup size n={n}")

    x_bar = df_subgroups.mean(axis=1)
    s = df_subgroups.std(axis=1, ddof=1)
    s_bar = s.mean()
    x_double_bar = x_bar.mean()

    # X-bar chart limits (using A3)
    ucl_x = x_double_bar + constants['A3'] * s_bar
    lcl_x = x_double_bar - constants['A3'] * s_bar

    # S chart limits
    ucl_s = constants['B4'] * s_bar
    lcl_s = constants['B3'] * s_bar
    
    # Calculate sigma zones
    sigma = (ucl_x - x_double_bar) / 3

    return {
        'x_chart': {
            'ucl': float(ucl_x),
            'lcl': float(lcl_x),
            'cl': float(x_double_bar),
            'sigma': float(sigma),
            'ucl_1sigma': float(x_double_bar + sigma),
            'lcl_1sigma': float(x_double_bar - sigma),
            'ucl_2sigma': float(x_double_bar + 2 * sigma),
            'lcl_2sigma': float(x_double_bar - 2 * sigma)
        },
        's_chart': {
            'ucl': float(ucl_s),
            'lcl': float(lcl_s),
            'cl': float(s_bar)
        },
        'data': {
            'x_bar': x_bar.tolist(),
            's': s.tolist(),
            'subgroups': list(range(1, len(x_bar) + 1))
        },
        'subgroup_size': n
    }

def calculate_process_capability(data, usl, lsl):
    """Calculate Cp, Cpk, Pp, Ppk and additional capability metrics."""
    if usl is None or lsl is None:
        return None
        
    mean = np.mean(data)
    std_dev = np.std(data, ddof=1)
    
    if std_dev == 0:
        return None
    
    # Capability indices
    cp = (usl - lsl) / (6 * std_dev)
    cpu = (usl - mean) / (3 * std_dev)
    cpl = (mean - lsl) / (3 * std_dev)
    cpk = min(cpu, cpl)
    
    # Performance indices (same as capability for now)
    pp = cp
    ppu = cpu
    ppl = cpl
    ppk = cpk
    
    # Z-scores
    z_usl = (usl - mean) / std_dev if std_dev > 0 else 0
    z_lsl = (mean - lsl) / std_dev if std_dev > 0 else 0
    z_min = min(z_usl, z_lsl)
    
    # Defect rates (parts per million)
    from scipy import stats
    ppm_upper = (1 - stats.norm.cdf(z_usl)) * 1e6 if z_usl > 0 else 0
    ppm_lower = stats.norm.cdf(-z_lsl) * 1e6 if z_lsl > 0 else 0
    ppm_total = ppm_upper + ppm_lower
    
    # Process centering
    target = (usl + lsl) / 2
    offset = mean - target
    centering_index = 1 - abs(offset) / ((usl - lsl) / 2)
    
    return {
        'cp': float(cp),
        'cpk': float(cpk),
        'pp': float(pp),
        'ppk': float(ppk),
        'cpu': float(cpu),
        'cpl': float(cpl),
        'z_upper': float(z_usl),
        'z_lower': float(z_lsl),
        'z_min': float(z_min),
        'sigma_level': float(z_min),
        'mean': float(mean),
        'std_dev': float(std_dev),
        'target': float(target),
        'offset': float(offset),
        'centering_index': float(centering_index),
        'ppm_upper': float(ppm_upper),
        'ppm_lower': float(ppm_lower),
        'ppm_total': float(ppm_total),
        'yield_percent': float(100 - (ppm_total / 10000))
    }

def analyze_process_stability(violations_x, violations_secondary):
    """Analyze overall process stability."""
    total_violations = len(violations_x) + len(violations_secondary)
    
    critical_count = sum(1 for v in violations_x + violations_secondary if v.get('severity') == 'critical')
    warning_count = sum(1 for v in violations_x + violations_secondary if v.get('severity') == 'warning')
    
    if total_violations == 0:
        status = 'stable'
        message = 'Process is in statistical control. No special causes detected.'
        color = 'green'
    elif critical_count > 0:
        status = 'unstable'
        message = f'Process is OUT OF CONTROL. {critical_count} critical violation(s) detected. Immediate action required.'
        color = 'red'
    elif warning_count > 0:
        status = 'warning'
        message = f'Process shows concerning patterns. {warning_count} warning(s) detected. Investigation recommended.'
        color = 'yellow'
    else:
        status = 'monitor'
        message = 'Process requires monitoring. Minor patterns detected.'
        color = 'blue'
    
    return {
        'status': status,
        'message': message,
        'color': color,
        'total_violations': total_violations,
        'critical_violations': critical_count,
        'warning_violations': warning_count
    }

def generate_insights(chart_results, capability, stability, performance):
    """Generate actionable insights."""
    insights = []
    
    # Stability insights
    if stability['status'] == 'stable':
        insights.append({
            'type': 'success',
            'title': 'Process Stability',
            'message': 'Process is in statistical control with no special cause variation detected.',
            'priority': 'info'
        })
    elif stability['status'] == 'unstable':
        insights.append({
            'type': 'error',
            'title': 'Out of Control',
            'message': f"{stability['critical_violations']} critical violations detected. Investigate root causes immediately.",
            'priority': 'critical'
        })
    elif stability['status'] == 'warning':
        insights.append({
            'type': 'warning',
            'title': 'Process Patterns Detected',
            'message': 'Non-random patterns suggest assignable causes. Review process conditions.',
            'priority': 'high'
        })
    
    # Capability insights
    if capability:
        cpk = capability['cpk']
        if cpk >= 2.0:
            insights.append({
                'type': 'success',
                'title': 'Excellent Capability',
                'message': f'Cpk = {cpk:.2f}. Process is highly capable (6-sigma level).',
                'priority': 'info'
            })
        elif cpk >= 1.33:
            insights.append({
                'type': 'success',
                'title': 'Process Capable',
                'message': f'Cpk = {cpk:.2f}. Process meets minimum capability requirement.',
                'priority': 'info'
            })
        elif cpk >= 1.0:
            insights.append({
                'type': 'warning',
                'title': 'Marginally Capable',
                'message': f'Cpk = {cpk:.2f}. Process barely meets specs. Improvement needed.',
                'priority': 'medium'
            })
        else:
            insights.append({
                'type': 'error',
                'title': 'Not Capable',
                'message': f'Cpk = {cpk:.2f}. Process cannot meet specifications. Major improvements required.',
                'priority': 'critical'
            })
        
        # Centering insight
        if abs(capability['offset']) > (capability['std_dev'] * 0.5):
            insights.append({
                'type': 'warning',
                'title': 'Process Off-Center',
                'message': f"Process mean is {capability['offset']:.3f} units off target. Re-centering could improve Cpk.",
                'priority': 'medium'
            })
        
        # Defect rate insight
        if capability['ppm_total'] > 1000:
            insights.append({
                'type': 'warning',
                'title': 'High Defect Rate',
                'message': f"Estimated {capability['ppm_total']:.0f} PPM defects. Current yield: {capability['yield_percent']:.2f}%",
                'priority': 'high'
            })
    
    # Variation insight
    cv = performance['cv']
    if cv > 10:
        insights.append({
            'type': 'info',
            'title': 'High Process Variation',
            'message': f'Coefficient of variation is {cv:.1f}%. Consider variation reduction initiatives.',
            'priority': 'medium'
        })
    
    return insights

def main():
    try:
        payload = json.load(sys.stdin)
        data = pd.DataFrame(payload.get('data'))
        measurement_col = payload.get('measurement_col')
        subgroup_col = payload.get('subgroup_col')
        chart_type = payload.get('chart_type', 'xbar-r')
        usl = payload.get('usl')
        lsl = payload.get('lsl')
        
        if not measurement_col or not subgroup_col:
            raise ValueError("Measurement and subgroup columns are required.")
        
        if measurement_col not in data.columns:
            raise ValueError(f"Measurement column '{measurement_col}' not found in data.")
        
        if subgroup_col not in data.columns:
            raise ValueError(f"Subgroup column '{subgroup_col}' not found in data.")
        
        # Group by subgroup
        subgroups = data.groupby(subgroup_col)[measurement_col].apply(list)
        
        # Check for equal subgroup sizes
        subgroup_sizes = subgroups.apply(len)
        if subgroup_sizes.nunique() != 1:
            raise ValueError(f"All subgroups must have the same size. Found sizes: {subgroup_sizes.unique().tolist()}")
        
        n = subgroup_sizes.iloc[0]
        
        if n < 2:
            raise ValueError(f"Subgroup size must be at least 2. Found: {n}")
        
        if n > 25:
            raise ValueError(f"Subgroup size must be 25 or less. Found: {n}")

        # Convert to DataFrame with subgroups as rows
        df_subgroups = pd.DataFrame(subgroups.tolist())

        # Calculate control charts
        if chart_type == 'xbar-r':
            chart_results = calculate_xbar_r_chart(df_subgroups)
        elif chart_type == 'xbar-s':
            chart_results = calculate_xbar_s_chart(df_subgroups)
        else:
            raise ValueError(f"Chart type '{chart_type}' is not supported.")

        # Process performance
        all_measurements = data[measurement_col].dropna().values
        performance = calculate_process_performance(all_measurements)
        
        # Capability Analysis
        capability = calculate_process_capability(all_measurements, usl, lsl)
        
        # Enhanced violation detection using Western Electric Rules
        x_chart_violations = detect_western_electric_rules(
            chart_results['data']['x_bar'],
            chart_results['x_chart']['ucl'],
            chart_results['x_chart']['lcl'],
            chart_results['x_chart']['cl']
        )
        
        secondary_chart_key = 'r_chart' if chart_type == 'xbar-r' else 's_chart'
        secondary_data_key = 'r' if chart_type == 'xbar-r' else 's'
        secondary_chart_violations = detect_western_electric_rules(
            chart_results['data'][secondary_data_key],
            chart_results[secondary_chart_key]['ucl'],
            chart_results[secondary_chart_key]['lcl'],
            chart_results[secondary_chart_key]['cl']
        )
        
        # Process stability analysis
        stability = analyze_process_stability(x_chart_violations, secondary_chart_violations)
        
        # Generate insights
        insights = generate_insights(chart_results, capability, stability, performance)

        response = {
            'results': {
                'chart_results': chart_results,
                'capability': capability,
                'performance': performance,
                'violations': {
                    'x_chart': x_chart_violations,
                    'secondary_chart': secondary_chart_violations
                },
                'stability': stability,
                'insights': insights,
                'chart_type': chart_type
            }
        }
        
        print(json.dumps(response, default=_to_native_type))

    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(json.dumps({"error": str(e), "details": error_details}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
    