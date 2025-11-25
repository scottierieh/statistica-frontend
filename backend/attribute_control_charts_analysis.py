
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

def calculate_p_chart(defects, sample_sizes):
    p_bar = np.sum(defects) / np.sum(sample_sizes)
    p_chart_values = defects / sample_sizes
    
    # Control limits vary for each subgroup if sample sizes are not constant
    sigma = np.sqrt(p_bar * (1 - p_bar) / sample_sizes)
    ucl = p_bar + 3 * sigma
    lcl = np.maximum(0, p_bar - 3 * sigma)
    
    violations = np.where((p_chart_values > ucl) | (p_chart_values < lcl))[0]
    
    return {
        'chart_type': 'p-Chart',
        'center_line': p_bar,
        'ucl': ucl.tolist(),
        'lcl': lcl.tolist(),
        'points': p_chart_values.tolist(),
        'violations': violations.tolist()
    }

def calculate_np_chart(defects, sample_size):
    p_bar = np.sum(defects) / (len(defects) * sample_size)
    np_bar = np.mean(defects)
    
    sigma = np.sqrt(np_bar * (1 - p_bar))
    ucl = np_bar + 3 * sigma
    lcl = np.maximum(0, np_bar - 3 * sigma)
    
    violations = np.where((defects > ucl) | (defects < lcl))[0]
    
    return {
        'chart_type': 'np-Chart',
        'center_line': np_bar,
        'ucl': ucl,
        'lcl': lcl,
        'points': defects.tolist(),
        'violations': violations.tolist()
    }

def calculate_c_chart(defects):
    c_bar = np.mean(defects)
    
    sigma = np.sqrt(c_bar)
    ucl = c_bar + 3 * sigma
    lcl = np.maximum(0, c_bar - 3 * sigma)
    
    violations = np.where((defects > ucl) | (defects < lcl))[0]
    
    return {
        'chart_type': 'c-Chart',
        'center_line': c_bar,
        'ucl': ucl,
        'lcl': lcl,
        'points': defects.tolist(),
        'violations': violations.tolist()
    }

def calculate_u_chart(defects, sample_sizes):
    u_values = defects / sample_sizes
    u_bar = np.sum(defects) / np.sum(sample_sizes)
    
    sigma = np.sqrt(u_bar / sample_sizes)
    ucl = u_bar + 3 * sigma
    lcl = np.maximum(0, u_bar - 3 * sigma)
    
    violations = np.where((u_values > ucl) | (u_values < lcl))[0]
    
    return {
        'chart_type': 'u-Chart',
        'center_line': u_bar,
        'ucl': ucl.tolist(),
        'lcl': lcl.tolist(),
        'points': u_values.tolist(),
        'violations': violations.tolist()
    }


def main():
    try:
        payload = json.load(sys.stdin)
        data = pd.DataFrame(payload.get('data'))
        chart_type = payload.get('chart_type')
        defects_col = payload.get('defects_col')
        sample_size_col = payload.get('sample_size_col')

        if not chart_type or not defects_col:
            raise ValueError("chart_type and defects_col are required.")
            
        defects = pd.to_numeric(data[defects_col], errors='coerce').dropna().values

        if chart_type in ['p', 'u']:
            if not sample_size_col:
                raise ValueError("sample_size_col is required for p-chart and u-chart.")
            sample_sizes = pd.to_numeric(data[sample_size_col], errors='coerce').dropna().values
            if len(defects) != len(sample_sizes):
                 raise ValueError("Defects and sample sizes must have the same length.")
        
        results = {}
        if chart_type == 'p':
            results = calculate_p_chart(defects, sample_sizes)
        elif chart_type == 'np':
            if data[sample_size_col].nunique() != 1:
                raise ValueError("np-chart requires a constant sample size.")
            sample_size = data[sample_size_col].iloc[0]
            results = calculate_np_chart(defects, sample_size)
        elif chart_type == 'c':
            results = calculate_c_chart(defects)
        elif chart_type == 'u':
            results = calculate_u_chart(defects, sample_sizes)
        else:
            raise ValueError(f"Unknown chart type: {chart_type}")

        print(json.dumps({'results': results}, default=_to_native_type))

    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()


