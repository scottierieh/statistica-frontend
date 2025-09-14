import json
import pandas as pd
import numpy as np

from onewayanova import OneWayANOVA
from reliability import ReliabilityAnalysis

from firebase_functions import https_fn
from firebase_admin import initialize_app

initialize_app()

def convert_numpy(obj):
    """Recursively convert numpy and pandas types for JSON serialization."""
    if isinstance(obj, np.generic):
        return obj.item() if not pd.isna(obj) else None
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
        req_data = req.get_json(silent=True)
        data = req_data.get('data')
        independent_var = req_data.get('independentVar')
        dependent_var = req_data.get('dependentVar')
        
        if not all([data, independent_var, dependent_var]):
            raise ValueError("Missing required fields for ANOVA analysis")
        
        df = pd.DataFrame(data)
        analyzer = OneWayANOVA(data=df, group_col=independent_var, value_col=dependent_var)
        analyzer.analyze()
        results = convert_numpy(analyzer.results)
        
        return https_fn.Response(json.dumps(results), status=200, headers={"Content-Type": "application/json"})

    except Exception as e:
        print(f"Error in ANOVA endpoint: {e}")
        return https_fn.Response(json.dumps({"error": str(e)}), status=500, headers={"Content-Type": "application/json"})

@https_fn.on_request(cors=True)
def reliability(req: https_fn.Request) -> https_fn.Response:
    try:
        req_data = req.get_json(silent=True)
        data = req_data.get('data')
        items = req_data.get('items')
        reverse_code = req_data.get('reverseCodeItems', [])
        
        if not all([data, items]):
            raise ValueError("Missing required fields for reliability analysis")
        
        df = pd.DataFrame(data)
        analyzer = ReliabilityAnalysis(data=df, standardize=False)
        analysis_result = analyzer.cronbach_alpha(item_cols=items, reverse_code=reverse_code)
        results = convert_numpy(analysis_result)
        
        return https_fn.Response(json.dumps(results), status=200, headers={"Content-Type": "application/json"})

    except Exception as e:
        print(f"Error in Reliability endpoint: {e}")
        return https_fn.Response(json.dumps({"error": str(e)}), status=500, headers={"Content-Type": "application/json"})
