
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

# Import analysis functions
from effectiveness_analysis import run_effectiveness_analysis
from simple_test_analysis import run_simple_test_analysis
from descriptive_stats_analysis import run_descriptive_stats_analysis

app = FastAPI()

# CORS 설정
origins = [
    "http://localhost:9002",
    "http://127.0.0.1:9002",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "*",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class EffectivenessPayload(BaseModel):
    data: List[Dict[str, Any]]
    outcome: str
    time: Optional[str] = None
    group: Optional[str] = None
    covariates: Optional[List[str]] = []

class SimpleTestPayload(BaseModel):
    numbers: List[float]

class DescriptiveStatsPayload(BaseModel):
    data: List[Dict[str, Any]]
    variables: List[str]
    groupBy: Optional[str] = None

@app.get("/")
def read_root():
    return {"message": "Statistica Backend is running"}

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/api/analysis/effectiveness")
async def analyze_effectiveness(payload: EffectivenessPayload):
    try:
        results = run_effectiveness_analysis(
            data=payload.data,
            outcome_var=payload.outcome,
            time_var=payload.time,
            group_var=payload.group,
            covariates=payload.covariates
        )
        return results
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/analysis/simple-test")
async def analyze_simple_test(payload: SimpleTestPayload):
    try:
        results = run_simple_test_analysis(payload.numbers)
        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/analysis/descriptive")
async def analyze_descriptive_stats(payload: DescriptiveStatsPayload):
    try:
        results = run_descriptive_stats_analysis(
            data=payload.data,
            variables=payload.variables,
            group_by_var=payload.groupBy
        )
        return results
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

