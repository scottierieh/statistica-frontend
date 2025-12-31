from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any

# Import analysis functions
from effectiveness_analysis import run_effectiveness_analysis

app = FastAPI()

# CORS 설정
origins = [
    "http://localhost:9002",  # Next.js 개발 서버 주소
    "http://127.0.0.1:9002",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnalysisPayload(BaseModel):
    data: List[Dict[str, Any]]
    outcomeVar: str
    timeVar: str | None = None
    groupVar: str | None = None
    covariates: List[str] | None = []

@app.get("/")
def read_root():
    return {"message": "Statistica Backend is running"}

@app.post("/api/analysis/effectiveness")
async def analyze_effectiveness(payload: AnalysisPayload):
    try:
        results = run_effectiveness_analysis(
            data=payload.data,
            outcome_var=payload.outcomeVar,
            time_var=payload.timeVar,
            group_var=payload.groupVar,
            covariates=payload.covariates
        )
        return results
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
