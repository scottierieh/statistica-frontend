
import sys
import json
import numpy as np
import pandas as pd
from scipy.stats import iqr
import warnings
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any

warnings.filterwarnings("ignore")

app = FastAPI()

class DataPayload(BaseModel):
    data: List[Dict[str, Any]]
    variables: List[str]

def _to_native_type(obj): # Helper function to convert numpy types to native Python types
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    return obj

def get_interpretation(results):
    if not results:
        return "No data to interpret."

    try:
        lowest_cv_item = min(results, key=lambda x: x.get("cv", float("inf")))
        highest_cv_item = max(results, key=lambda x: x.get("cv", float("-inf")))
    except ValueError:
        return "Could not determine variability interpretation."

    interpretation = (
        f"**Interpretation:** {lowest_cv_item["variable"]} shows the lowest variability (CV={lowest_cv_item["cv"]:.1f}%), "
        f"indicating consistent perception or measurement. "
        f"On the other hand, {highest_cv_item["variable"]} has the highest variability (CV={highest_cv_item["cv"]:.1f}%), "
        f"suggesting diverse opinions or data points. This could indicate potential for targeted strategies or further investigation into the causes of this variation."
    )
    return interpretation

@app.post("/api/variability")
async def analyze_variability(payload: DataPayload):
    try:
        df = pd.DataFrame(payload.data)
        
        analysis_results = []

        for var in payload.variables:
            if var not in df.columns:
                continue

            series = pd.to_numeric(df[var], errors="coerce").dropna()
            
            if len(series) < 2:
                continue
                
            range_val = float(series.max() - series.min())
            iqr_val = float(iqr(series))
            mean_val = float(series.mean())
            std_val = float(series.std())
            
            cv_val = (std_val / mean_val) * 100 if mean_val != 0 else 0
            
            analysis_results.append({
                "variable": var,
                "range": range_val,
                "iqr": iqr_val,
                "cv": cv_val,
                "mean": mean_val,
                "std_dev": std_val
            })

        interpretation = get_interpretation(analysis_results)
        
        response = {
            "results": analysis_results,
            "interpretation": interpretation
        }

        return json.loads(json.dumps(response, default=_to_native_type))

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


