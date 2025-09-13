
from flask import Flask, request, jsonify
import pandas as pd
from onewayanova import OneWayANOVA

app = Flask(__name__)

@app.route('/api/analysis/anova', methods=['POST'])
def anova():
    try:
        req_data = request.json
        data = req_data['data']
        independent_var = req_data['independentVar']
        dependent_var = req_data['dependentVar']
        
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

        return jsonify(serializable_results)

    except Exception as e:
        # Print error to server logs for debugging
        print(f"Error in ANOVA endpoint: {e}")
        # Return a meaningful error to the frontend
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True)
