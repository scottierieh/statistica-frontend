from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

# Import analysis functions
from effectiveness_analysis import run_effectiveness_analysis

app = FastAPI()

# CORS 설정 - 더 넓은 범위로 설정
origins = [
    "http://localhost:9002",
    "http://127.0.0.1:9002",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "*",  # 개발 환경에서는 모든 origin 허용
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 개발 환경에서는 모든 origin 허용
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnalysisPayload(BaseModel):
    data: List[Dict[str, Any]]
    outcomeVar: str
    timeVar: Optional[str] = None
    groupVar: Optional[str] = None
    covariates: Optional[List[str]] = []

@app.get("/")
def read_root():
    return {"message": "Statistica Backend is running"}

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/api/analysis/effectiveness")
async def analyze_effectiveness(payload: AnalysisPayload):
    try:
        print(f"Received payload: outcomeVar={payload.outcomeVar}, timeVar={payload.timeVar}, groupVar={payload.groupVar}")
        print(f"Data length: {len(payload.data)}")
        
        results = run_effectiveness_analysis(
            data=payload.data,
            outcome_var=payload.outcomeVar,
            time_var=payload.timeVar,
            group_var=payload.groupVar,
            covariates=payload.covariates or []
        )
        return results
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
    