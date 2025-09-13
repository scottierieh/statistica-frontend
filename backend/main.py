
from flask import Flask, request, jsonify
import pandas as pd
import statsmodels.api as sm
from statsmodels.formula.api import ols

app = Flask(__name__)

@app.route('/api/analysis/descriptive', methods=['POST'])
def descriptive_stats():
    data = request.json['data']
    df = pd.DataFrame(data)
    description = df.describe()
    return jsonify(description.to_dict())

@app.route('/api/analysis/correlation', methods=['POST'])
def correlation():
    data = request.json['data']
    df = pd.DataFrame(data)
    corr_matrix = df.corr()
    return jsonify(corr_matrix.to_dict())

@app.route('/api/analysis/anova', methods=['POST'])
def anova():
    data = request.json['data']
    independent_var = request.json['independentVar']
    dependent_var = request.json['dependentVar']
    
    df = pd.DataFrame(data)
    
    formula = f'{dependent_var} ~ C({independent_var})'
    model = ols(formula, data=df).fit()
    anova_table = sm.stats.anova_lm(model, typ=2)
    
    return jsonify(anova_table.to_dict())

if __name__ == '__main__':
    app.run(debug=True)
