
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

# Import analysis functions
from .effectiveness_analysis import run_effectiveness_analysis
from .simple_test_analysis import run_simple_test_analysis
from .descriptive_stats_analysis import run_descriptive_stats_analysis
from .sem_analysis import run_sem_analysis
from .ant_colony_analysis import run_ant_colony_analysis
from .goal_programming_analysis import run_goal_programming_analysis
from .linear_programming_analysis import run_linear_programming_analysis
from .sgd_simulation import run_sgd_simulation
from .transportation_analysis import run_transportation_analysis
from .dynamic_programming_analysis import run_dynamic_programming_analysis

# Firebase Admin SDK
import firebase_admin
from firebase_admin import credentials, firestore

# Initialize Firebase Admin
try:
    # In a deployed environment, GOOGLE_APPLICATION_CREDENTIALS will be set
    cred = credentials.ApplicationDefault() 
    firebase_admin.initialize_app(cred)
except Exception as e:
    # For local development, you might use a service account file
    # Make sure to handle this securely and not commit your key file
    try:
        if not firebase_admin._apps:
            # Fallback for local dev if needed, but avoid if already initialized
            cred = credentials.Certificate("path/to/your/serviceAccountKey.json") 
            firebase_admin.initialize_app(cred)
    except Exception as local_e:
        print(f"Warning: Firebase Admin SDK initialization failed. Errors: {e}, {local_e}")
        # The app can still run, but Firebase features will fail.
        pass

db = None
try:
    db = firestore.client()
except Exception as e:
    print(f"Warning: Could not connect to Firestore: {e}")


app = FastAPI()

# CORS settings
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

# --- Pydantic Models for Payloads ---

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

class SemPayload(BaseModel):
    data: List[Dict[str, Any]]
    model_spec: str
    estimator: str

class TeamInvitationPayload(BaseModel):
    email: str
    role: str = 'Member'

class InvitationUpdatePayload(BaseModel):
    role: Optional[str] = None
    status: Optional[str] = None

class AntColonyPayload(BaseModel):
    cities: List[Dict[str, Any]]
    params: Dict[str, Any]

class GoalProgrammingPayload(BaseModel):
    goals: List[Dict[str, Any]]
    constraints: List[Dict[str, Any]]

class LinearProgrammingPayload(BaseModel):
    c: List[float]
    A: List[List[float]]
    b: List[float]
    constraint_types: List[str]
    objective: str
    variable_types: Optional[List[str]] = None
    problem_type: Optional[str] = 'lp'

class SgdPayload(BaseModel):
    learning_rate: float
    epochs: int
    batch_size: int
    start_x: float
    start_y: float

class TransportationPayload(BaseModel):
    costs: List[List[float]]
    supply: List[float]
    demand: List[float]

class KnapsackItem(BaseModel):
    name: str
    weight: int
    value: float

class DynamicProgrammingPayload(BaseModel):
    items: List[KnapsackItem]
    capacity: int

# --- API Endpoints ---

@app.get("/")
def read_root():
    return {"message": "Statistica Backend is running"}

@app.get("/health")
def health_check():
    return {"status": "ok"}

# --- Analysis Endpoints ---

@app.post("/api/analysis/sem")
async def analyze_sem(payload: SemPayload):
    try:
        results = run_sem_analysis(
            data=payload.data,
            model_spec=payload.model_spec,
            estimator=payload.estimator
        )
        return results
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))

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

@app.post("/api/analysis/ant-colony")
async def analyze_ant_colony(payload: AntColonyPayload):
    try:
        return run_ant_colony_analysis(payload.dict())
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/analysis/goal-programming")
async def analyze_goal_programming(payload: GoalProgrammingPayload):
    try:
        return run_goal_programming_analysis(payload.dict())
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/analysis/linear-programming")
async def analyze_linear_programming(payload: LinearProgrammingPayload):
    try:
        return run_linear_programming_analysis(payload.dict())
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/analysis/sgd")
async def analyze_sgd(payload: SgdPayload):
    try:
        return run_sgd_simulation(**payload.dict())
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/analysis/transportation-problem")
async def analyze_transportation(payload: TransportationPayload):
    try:
        return run_transportation_analysis(payload.dict())
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/analysis/dynamic-programming")
async def analyze_dynamic_programming(payload: DynamicProgrammingPayload):
    try:
        return run_dynamic_programming_analysis(payload.dict())
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# --- Team Management Endpoints ---

@app.post("/api/teams/invitations")
async def invite_team_member(payload: TeamInvitationPayload):
    if not db:
        raise HTTPException(status_code=500, detail="Firestore is not configured on the server.")
    try:
        # Assuming a single team for now, hardcode teamId
        team_id = "default_team"
        
        # Create a new invitation document in Firestore
        invitation_ref = db.collection('teams').document(team_id).collection('invitations').document()
        
        invitation_data = {
            "id": invitation_ref.id,
            "teamId": team_id,
            "email": payload.email,
            "role": payload.role,
            "status": "pending",
            "createdAt": firestore.SERVER_TIMESTAMP
        }
        
        invitation_ref.set(invitation_data)
        
        return {"message": f"Invitation successfully sent to {payload.email}", "invitation": invitation_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create invitation: {str(e)}")

@app.get("/api/teams/invitations")
async def get_invitations():
    if not db:
        return []
    try:
        team_id = "default_team"
        invitations_ref = db.collection('teams').document(team_id).collection('invitations')
        invitations = [doc.to_dict() for doc in invitations_ref.stream()]
        
        # Convert timestamps to strings
        for inv in invitations:
            if 'createdAt' in inv and inv['createdAt']:
                # Timestamps from Firestore can be None if not set yet
                if hasattr(inv['createdAt'], 'isoformat'):
                    inv['createdAt'] = inv['createdAt'].isoformat()

        return invitations
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch invitations: {str(e)}")


@app.put("/api/teams/invitations/{invitation_id}")
async def update_invitation(invitation_id: str, payload: InvitationUpdatePayload):
    if not db:
        raise HTTPException(status_code=500, detail="Firestore is not configured on the server.")
    try:
        team_id = "default_team"
        invitation_ref = db.collection('teams').document(team_id).collection('invitations').document(invitation_id)
        
        update_data = {}
        if payload.role:
            update_data['role'] = payload.role
        if payload.status:
            update_data['status'] = payload.status
            
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")

        invitation_ref.update(update_data)
        
        return {"message": "Invitation status updated."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update invitation: {str(e)}")


@app.delete("/api/teams/invitations")
async def delete_invitation(id: str):
    if not db:
        raise HTTPException(status_code=500, detail="Firestore is not configured on the server.")
    try:
        team_id = "default_team"
        invitation_ref = db.collection('teams').document(team_id).collection('invitations').document(id)
        invitation_ref.delete()
        
        return {"message": "Invitation deleted."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete invitation: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
