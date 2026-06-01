from datetime import datetime, timedelta
import asyncio
import uuid
from fastapi import FastAPI, HTTPException, Header, Query, Request
from fastapi.concurrency import asynccontextmanager, run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
from app.pipeline import run_dbscan, run_umap_dbscan
from app.history_nlp import generate_embeddings, load_and_clean_chrome_history

async def clean_expired_sessions():
    try:
        while True:
            await asyncio.sleep(3600)
            
            now = datetime.now()
            expired_keys = []
            
            for session_id, data in SESSION_CACHE.items():
                if now - data["timestamp"] > timedelta(hours=24):
                    expired_keys.append(session_id)
                    
            for key in expired_keys:
                del SESSION_CACHE[key]
                
    except asyncio.CancelledError:
        print("Session cleanup task gracefully stopped.")

@asynccontextmanager
async def lifespan(app: FastAPI):
    cleanup_task = asyncio.create_task(clean_expired_sessions())
    
    yield 
    
    cleanup_task.cancel()

app = FastAPI(title="Trace API", lifespan=lifespan)

# Configure CORS so your Vite development server (usually localhost:5173) can talk to your backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", 
                   "https://trace-app.net",
                   "https://www.trace-app.net"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

pipeline_lock = asyncio.Lock()

SESSION_CACHE = {} 

@app.get("/api/verify-session")
async def verify_session(authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="MISSING_TOKEN")
    
    session_id = authorization.replace("Bearer ", "")
    
    if session_id not in SESSION_CACHE: 
        raise HTTPException(status_code=404, detail="SESSION_EXPIRED")
        
    return {"status": "valid"}

@app.post("/api/upload-history")
async def upload_history(request: Request):
    history = await request.json()
    
    session_id = str(uuid.uuid4())
    
    df = load_and_clean_chrome_history(history)
    embeddings = generate_embeddings(df)
    
    SESSION_CACHE[session_id] = {
        "raw_data": df,
        "embeddings": embeddings,
        "coords_3d": None,
        "timestamp": datetime.now()
    }
    
    nodes, coords_3d = run_umap_dbscan(df, embeddings, 1500, 15, 0.1, 42, 0.3, 3)
    
    SESSION_CACHE[session_id]["coords_3d"] = coords_3d

    return {"session_id": session_id, "nodes": nodes}


@app.post("/api/recalculate")
async def recalculate_galaxy(
    session_id: str,
    max_items: int = Query(1500, description="Max history items"),
    n_neighbors: int = Query(15, description="UMAP neighbors"),
    min_dist: float = Query(0.1, description="UMAP minimum distance"),
    seed: int = Query(42, description="UMAP random seed"),
    eps: float = Query(0.3, description="DBSCAN epsilon radius"),
    min_samples: int = Query(3, description="DBSCAN minimum samples")
):
    
    if session_id not in SESSION_CACHE:
        raise HTTPException(status_code=404, detail="SESSION_EXPIRED")
        
    cached_data = SESSION_CACHE[session_id]
    
    async with pipeline_lock:
        try:
            processed_data, coords_3d = await run_in_threadpool(
                run_umap_dbscan,
                cached_data["raw_data"],
                cached_data["embeddings"],
                max_items=max_items,
                n_neighbors=n_neighbors,
                min_dist=min_dist,
                seed=seed,
                eps=eps,
                min_samples=min_samples
            )
            
            SESSION_CACHE[session_id]["coords_3d"] = coords_3d

            return {
                "status": "success",
                "total_nodes": len(processed_data),
                "nodes": processed_data
            }
        
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    

@app.get("/api/recluster")
async def recluster(
    session_id: str,
    max_items: int = Query(1500, description="Max history items"),
    eps: float = Query(0.3, description="DBSCAN epsilon radius"),
    min_samples: int = Query(3, description="DBSCAN minimum samples")
):
    if session_id not in SESSION_CACHE:
        raise HTTPException(status_code=404, detail="SESSION_EXPIRED")

    cached_data = SESSION_CACHE[session_id]

    if "coords_3d" not in cached_data:
        raise HTTPException(status_code=400, detail="3D coordinates not found. Please click Recalculate Galaxy first.")

    async with pipeline_lock:
        try:
            processed_data = await run_in_threadpool(
                run_dbscan,
                cached_data["raw_data"],
                cached_data["coords_3d"],
                max_items=max_items,
                eps=eps,
                min_samples=min_samples
            )
            
            return {
                "status": "success",
                "total_nodes": len(processed_data),
                "nodes": processed_data
            }
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
