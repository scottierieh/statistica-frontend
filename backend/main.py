from firebase_functions import https_fn
from firebase_admin import initialize_app
import json
import pandas as pd
import numpy as np

from onewayanova import OneWayANOVA
from reliability import ReliabilityAnalysis

# Initialize Firebase Admin SDK
try:
    initialize_app()
except ValueError:
    pass # Already initialized

def convert_numpy(obj):
    """Recursively convert numpy and pandas types for JSON serialization."""
    if isinstance(obj, (np.generic, pd.NA)):
        return None if pd.isna(obj) else obj.item()
    if isinstance(obj, pd.DataFrame):
        return obj.to_dict(orient='records')
    if isinstance(obj, pd.Series):
        return obj.to_dict()
    if hasattr(obj, 'tolist'):
        return obj.tolist()
    if isinstance(obj, dict):
        return {k: convert_numpy(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [convert_numpy(i) for i in obj]
    if pd.isna(obj):
        return None
    return obj

@https_fn.on_request(cors=True)
def anova(req: https_fn.Request) -> https_fn.Response:
    try:
        headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        }
        if req.method == 'OPTIONS':
            return https_fn.Response('', status=204, headers=headers)
        
        if req.method != 'POST':
            return https_fn.Response(json.dumps({"error": "Method not allowed"}), status=405, headers=headers)

        req_data = req.get_json()
        data = req_data.get('data')
        independent_var = req_data.get('independentVar')
        dependent_var = req_data.get('dependentVar')
        
        if not all([data, independent_var, dependent_var]):
            return https_fn.Response(json.dumps({"error": "Missing required fields"}), status=400, headers=headers)
        
        df = pd.DataFrame(data)
        analyzer = OneWayANOVA(data=df, group_col=independent_var, value_col=dependent_var)
        analyzer.analyze()
        results = convert_numpy(analyzer.results)
        
        return https_fn.Response(json.dumps(results), status=200, headers=headers)

    except Exception as e:
        print(f"Error in ANOVA endpoint: {e}")
        return https_fn.Response(json.dumps({"error": str(e)}), status=500, headers={'Access-Control-Allow-Origin': '*'})

@https_fn.on_request(cors=True)
def reliability(req: https_fn.Request) -> https_fn.Response:
    try:
        headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        }
        if req.method == 'OPTIONS':
            return https_fn.Response('', status=204, headers=headers)
        
        if req.method != 'POST':
            return https_fn.Response(json.dumps({"error": "Method not allowed"}), status=405, headers=headers)

        req_data = req.get_json()
        data = req_data.get('data')
        items = req_data.get('items')
        reverse_code = req_data.get('reverseCodeItems', [])
        
        if not all([data, items]):
            return https_fn.Response(json.dumps({"error": "Missing required fields"}), status=400, headers=headers)
        
        df = pd.DataFrame(data)
        analyzer = ReliabilityAnalysis(data=df, standardize=False)
        analysis_result = analyzer.cronbach_alpha(item_cols=items, reverse_code=reverse_code)
        results = convert_numpy(analysis_result)
        
        return https_fn.Response(json.dumps(results), status=200, headers=headers)

    except Exception as e:
        print(f"Error in Reliability endpoint: {e}")
        return https_fn.Response(json.dumps({"error": str(e)}), status=500, headers={'Access-Control-Allow-Origin': '*'})
