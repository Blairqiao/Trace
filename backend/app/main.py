import os
import asyncio
from fastapi import FastAPI, HTTPException, Query
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from app.pipeline import run_cluster_pipeline, run_full_pipeline

app = FastAPI(title="History Vector Space API")

# Configure CORS so your Vite development server (usually localhost:5173) can talk to your backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Relative location of your current development file
DATA_FILE_PATH = os.path.join(os.path.dirname(__file__), '../data/History.json')

pipeline_lock = asyncio.Lock()

@app.get("/api/history-galaxy")
async def get_history_galaxy(
    limit: int = Query(1500, description="Max history items"),
    n_neighbors: int = Query(15, description="UMAP neighbors"),
    min_dist: float = Query(0.1, description="UMAP minimum distance"),
    seed: int = Query(42, description="UMAP random seed"),
    eps: float = Query(0.3, description="DBSCAN epsilon radius"),
    min_samples: int = Query(3, description="DBSCAN minimum samples")
):
    async with pipeline_lock:
        try:
            processed_data = await run_in_threadpool(
                run_full_pipeline,
                DATA_FILE_PATH,
                max_items=limit,
                n_neighbors=n_neighbors,
                min_dist=min_dist,
                seed=seed,
                eps=eps,
                min_samples=min_samples
            )
            
            return {
                "status": "success",
                "total_nodes": len(processed_data),
                "nodes": processed_data
            }
            
        except FileNotFoundError:
            raise HTTPException(status_code=404, detail="Data file not found.")
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
        
@app.get("/api/cluster")
async def get_clusters(
    eps: float = Query(0.3, description="DBSCAN epsilon radius"),
    min_samples: int = Query(3, description="DBSCAN minimum samples")
):
    async with pipeline_lock:
        try:
            processed_data = await run_in_threadpool(
                run_cluster_pipeline,
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