
import sys
import json
import pandas as pd
import numpy as np
import semopy
import io
import networkx as nx
import matplotlib.pyplot as plt
import base64

def _to_native_type(obj):
    if isinstance(obj, np.integer): return int(obj)
    if isinstance(obj, (np.floating, float)):
        if np.isnan(obj) or np.isinf(obj): return None
        return float(obj)
    if isinstance(obj, np.ndarray): return obj.tolist()
    if isinstance(obj, (bool, np.bool_)): return bool(obj)
    return str(obj)

def parse_model_spec(model_spec):
    lines = model_spec.split('\n')
    latent_vars = {}
    regressions = []
    covariances = []
    for line in lines:
        line = line.strip()
        if not line or line.startswith('#'): continue
        if '=~' in line:
            latent, indicators = line.split('=~')
            latent = latent.strip()
            latent_vars[latent] = [i.strip() for i in indicators.split('+')]
        elif '~' in line and not line.endswith('~~'):
            dv, ivs_str = line.split('~')
            regressions.append({'dv': dv.strip(), 'ivs': [i.strip() for i in ivs_str.split('+')]})
        elif '~~' in line:
            var1, var2 = line.split('~~')
            covariances.append([var1.strip(), var2.strip()])
    return {'latent_vars': latent_vars, 'regressions': regressions, 'covariances': covariances}

def generate_path_diagram(model_spec, results):
    try:
        G = nx.DiGraph()
        latent_vars = results['parsed_model']['latent_vars'].keys()
        
        # Add nodes
        all_nodes = set(latent_vars)
        for lv, indicators in results['parsed_model']['latent_vars'].items():
            all_nodes.update(indicators)
        for reg in results['parsed_model']['regressions']:
            all_nodes.add(reg['dv'])
            all_nodes.update(reg['ivs'])
        
        for node in all_nodes:
            G.add_node(node, type='latent' if node in latent_vars else 'observed')

        # Add edges
        for lv, indicators in results['parsed_model']['latent_vars'].items():
            for ind in indicators:
                G.add_edge(lv, ind)
        for reg in results['parsed_model']['regressions']:
            for iv in reg['ivs']:
                G.add_edge(iv, reg['dv'])
        for cov in results['parsed_model']['covariances']:
             G.add_edge(cov[0], cov[1], arrowhead='none', style='dashed')
             G.add_edge(cov[1], cov[0], arrowhead='none', style='dashed')

        pos = nx.spring_layout(G, k=0.8, iterations=50, seed=42)
        
        plt.figure(figsize=(12, 8))
        
        # Nodes
        nx.draw_networkx_nodes(G, pos, nodelist=[n for n, d in G.nodes(data=True) if d['type'] == 'observed'], node_shape='s', node_color='skyblue', node_size=3000)
        nx.draw_networkx_nodes(G, pos, nodelist=[n for n, d in G.nodes(data=True) if d['type'] == 'latent'], node_shape='o', node_color='lightgreen', node_size=3000)
        
        # Edges
        nx.draw_networkx_edges(G, pos, arrowstyle='->', arrowsize=20, connectionstyle='arc3,rad=0.1')
        nx.draw_networkx_labels(G, pos, font_size=10, font_weight='bold')

        plt.title("Path Diagram", fontsize=16)
        plt.axis('off')
        
        buf = io.BytesIO()
        plt.savefig(buf, format='png', bbox_inches='tight')
        plt.close()
        buf.seek(0)
        return base64.b64encode(buf.read()).decode('utf-8')
    except Exception:
        return None

def main():
    try:
        payload = json.load(sys.stdin)
        data = pd.DataFrame(payload.get('data'))
        model_spec = payload.get('model_spec')
        estimator = payload.get('estimator', 'ML')
        
        if not model_spec: raise ValueError("Model specification is empty.")
        
        model = semopy.Model(model_spec)
        res = model.fit(data, obj=estimator)
        
        stats = semopy.gather_stats(res)
        estimates = model.inspect()
        
        parsed_model = parse_model_spec(model_spec)
        
        results = {
            "parsed_model": parsed_model,
            "measurement_model": {},
            "structural_model": [],
            "fit_indices": {
                'chi_square': stats.chi2[0], 'df': stats.dof[0], 'p_value': stats.p_value[0],
                'cfi': stats.cfi[0], 'tli': stats.tli[0], 'rmsea': stats.rmsea[0],
                'srmr': stats.srmr[0] if 'srmr' in stats.columns else None,
                'aic': stats.aic[0], 'bic': stats.bic[0], 'n': len(data)
            },
            "interpretation": { "key_insights": [], "overall_assessment": "" }
        }

        # Measurement model processing
        loadings = estimates[estimates['op'] == '=~']
        for lv in parsed_model['latent_vars']:
            indicators = parsed_model['latent_vars'][lv]
            lv_loadings = loadings[loadings['lval'] == lv]
            lv_data = {ind: lv_loadings[lv_loadings['rval'] == ind]['Estimate'].iloc[0] for ind in indicators if not lv_loadings[lv_loadings['rval'] == ind].empty}
            
            cronbach_alpha = None
            if len(indicators) > 1:
                try:
                    alpha_df = data[indicators]
                    cronbach_alpha = semopy.efa.cronbach_alpha(alpha_df)
                except Exception:
                    cronbach_alpha = None

            results['measurement_model'][lv] = {
                'indicators': indicators,
                'loadings': lv_loadings.set_index('rval')['Estimate'].to_dict(),
                'eigenvalue': None,
                'variance_explained': None,
                'cronbach_alpha': cronbach_alpha
            }

        # Structural model processing
        paths = estimates[(estimates['op'] == '~') | (estimates['op'] == '~~')]
        for _, row in paths.iterrows():
            is_r_squared = row['lval'] == row['rval'] and row['op'] == '~~'
            path_str = f"{row['lval']} {row['op']} {row['rval']}"
            results['structural_model'].append({
                'path': path_str, 'from': row['rval'], 'to': row['lval'],
                'estimate': row['Estimate'], 'std_error': row['Std. Err'],
                't_value': row.get('z-value', row.get('t-value')), 'p_value': row.get('p-value'),
                'significant': row.get('p-value', 1.0) < 0.05, 'is_r_squared': is_r_squared
            })
        
        # Interpretation
        fit = results['fit_indices']
        if fit['cfi'] >= 0.95 and fit['rmsea'] <= 0.06:
            results['interpretation']['overall_assessment'] = "Excellent model fit."
            results['interpretation']['key_insights'].append({"title": "Excellent Fit", "description": "Model fits the data very well according to CFI and RMSEA indices."})
        elif fit['cfi'] >= 0.90 and fit['rmsea'] <= 0.08:
            results['interpretation']['overall_assessment'] = "Acceptable model fit."
            results['interpretation']['key_insights'].append({"title": "Acceptable Fit", "description": "Model provides an acceptable fit to the data."})
        else:
            results['interpretation']['overall_assessment'] = "Poor model fit. Consider revising the model structure."
            results['interpretation']['key_insights'].append({"title": "Poor Fit", "description": "Model does not adequately fit the data. Revisions are recommended."})

        results['path_diagram'] = generate_path_diagram(model_spec, results)

        print(json.dumps(results, default=_to_native_type))

    except Exception as e:
        error_result = {"error": str(e)}
        print(json.dumps(