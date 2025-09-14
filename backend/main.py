from firebase_functions import https_fn
import json

@https_fn.on_request(cors=True)
def anova(req: https_fn.Request) -> https_fn.Response:
    try:
        # Import heavy libraries inside the function to reduce cold start time
        from firebase_admin import initialize_app
        import pandas as pd
        from onewayanova import OneWayANOVA
        
        # Initialize Firebase Admin SDK (only if not already initialized)
        try:
            initialize_app()
        except ValueError:
            # App already initialized
            pass
        # Handle CORS preflight request
        if req.method == 'OPTIONS':
            headers = {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '3600'
            }
            return https_fn.Response('', status=204, headers=headers)
        
        # Only allow POST requests
        if req.method != 'POST':
            return https_fn.Response(
                json.dumps({"error": "Method not allowed"}),
                status=405,
                headers={'Content-Type': 'application/json'}
            )

        # Parse JSON data
        req_data = req.get_json()
        if not req_data:
            return https_fn.Response(
                json.dumps({"error": "No JSON data provided"}),
                status=400,
                headers={'Content-Type': 'application/json'}
            )

        data = req_data.get('data')
        independent_var = req_data.get('independentVar')
        dependent_var = req_data.get('dependentVar')
        
        # Validate required fields
        if not all([data, independent_var, dependent_var]):
            return https_fn.Response(
                json.dumps({"error": "Missing required fields: data, independentVar, dependentVar"}),
                status=400,
                headers={'Content-Type': 'application/json'}
            )
        
        df = pd.DataFrame(data)

        # Initialize and run the analysis using the provided class
        anova_analyzer = OneWayANOVA(data=df, group_col=independent_var, value_col=dependent_var)
        anova_analyzer.analyze()

        # The results are stored in the .results dictionary
        results = anova_analyzer.results
        
        # Convert numpy types to native Python types for JSON serialization
        def convert_numpy(obj):
            if isinstance(obj, pd.DataFrame):
                return obj.to_dict(orient='records')
            if hasattr(obj, 'tolist'):
                return obj.tolist()
            if isinstance(obj, dict):
                return {k: convert_numpy(v) for k, v in obj.items()}
            if isinstance(obj, list):
                return [convert_numpy(i) for i in obj]
            if pd.isna(obj):
                return None
            return obj

        serializable_results = convert_numpy(results)

        # Return successful response with CORS headers
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
        # Log error for debugging
        print(f"Error in ANOVA endpoint: {e}")
        
        # Return error response with CORS headers
        headers = {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        }
        
        return https_fn.Response(
            json.dumps({"error": str(e)}),
            status=500,
            headers=headers
        )