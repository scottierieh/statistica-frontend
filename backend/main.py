
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import subprocess
import json
import sys

# Import analysis functions
from effectiveness_analysis import run_effectiveness_analysis
from simple_test_analysis import run_simple_test_analysis
from descriptive_stats_analysis import run_descriptive_stats_analysis

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

@app.get("/")
def read_root():
    return {"message": "Statistica Backend is running"}

@app.get("/health")
def health_check():
    return {"status": "ok"}
    
def run_script(script_name: str, payload: dict):
    process = subprocess.Popen(
        [sys.executable, script_name],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    stdout, stderr = process.communicate(json.dumps(payload))
    
    if process.returncode != 0:
        try:
            error_json = json.loads(stderr)
            raise HTTPException(status_code=400, detail=error_json.get('error', 'Unknown script error'))
        except json.JSONDecodeError:
            raise HTTPException(status_code=500, detail=f"Script error: {stderr}")

    try:
        return json.loads(stdout)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Failed to parse script output.")

@app.post("/api/analysis/sem")
async def analyze_sem(payload: SemPayload):
    return run_script('sem_analysis.py', payload.dict())

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


class InvitationUpdatePayload(BaseModel):
    role: Optional[str] = None
    status: Optional[str] = None

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
async def delete_invitation(id: str = Query(...)):
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
