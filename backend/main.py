from firebase_functions import https_fn
import json
import numpy as np
import pandas as pd
from firebase_admin import initialize_app
from onewayanova import OneWayANOVA
from reliability import ReliabilityAnalysis

# Initialize Firebase Admin SDK (only if not already initialized)
try:
    initialize_app()
except ValueError:
    # App already initialized
    pass

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
        # Handle CORS preflight request
        if req.method == 'OPTIONS':
            headers = {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '3600'
            }
            return https_fn.Response('', status=204, headers=headers)
        
        if req.method != 'POST':
            return https_fn.Response(
                json.dumps({"error": "Method not allowed"}),
                status=405,
                headers={'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}
            )

        req_data = req.get_json()
        if not req_data:
            return https_fn.Response(
                json.dumps({"error": "No JSON data provided"}),
                status=400,
                headers={'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}
            )

        data = req_data.get('data')
        independent_var = req_data.get('independentVar')
        dependent_var = req_data.get('dependentVar')
        
        if not all([data, independent_var, dependent_var]):
            return https_fn.Response(
                json.dumps({"error": "Missing required fields: data, independentVar, dependentVar"}),
                status=400,
                headers={'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}
            )
        
        df = pd.DataFrame(data)

        anova_analyzer = OneWayANOVA(data=df, group_col=independent_var, value_col=dependent_var)
        anova_analyzer.analyze()

        results = anova_analyzer.results
        serializable_results = convert_numpy(results)

        headers = {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        }
        
        return https_fn.Response(
            json.dumps(serializable_results),
            status=200,
            headers=headers
        )

    except Exception as e:
        print(f"Error in ANOVA endpoint: {e}")
        headers = {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        }
        return https_fn.Response(
            json.dumps({"error": str(e)}),
            status=500,
            headers=headers
        )

@https_fn.on_request(cors=True)
def reliability(req: https_fn.Request) -> https_fn.Response:
    try:
        # Handle CORS preflight request
        if req.method == 'OPTIONS':
            headers = {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '3600'
            }
            return https_fn.Response('', status=204, headers=headers)
        
        if req.method != 'POST':
            return https_fn.Response(
                json.dumps({"error": "Method not allowed"}),
                status=405,
                headers={'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}
            )

        req_data = req.get_json()
        if not req_data:
            return https_fn.Response(
                json.dumps({"error": "No JSON data provided"}),
                status=400,
                headers={'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}
            )

        data = req_data.get('data')
        items = req_data.get('items')
        reverse_code = req_data.get('reverseCodeItems', [])
        
        if not all([data, items]):
            return https_fn.Response(
                json.dumps({"error": "Missing required fields: data, items"}),
                status=400,
                headers={'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}
            )
        
        df = pd.DataFrame(data)

        # Initialize and run the analysis
        rel_analyzer = ReliabilityAnalysis(data=df, standardize=False)
        # For now, we only support Cronbach's Alpha, but this can be extended
        analysis_result = rel_analyzer.cronbach_alpha(item_cols=items, reverse_code=reverse_code)

        serializable_results = convert_numpy(analysis_result)

        headers = {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        }
        
        return https_fn.Response(
            json.dumps(serializable_results),
            status=200,
            headers=headers
        )

    except Exception as e:
        print(f"Error in Reliability endpoint: {e}")
        headers = {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        }
        return https_fn.Response(
            json.dumps({"error": str(e)}),
            status=500,
            headers=headers
        )
