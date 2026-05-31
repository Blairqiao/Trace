import os
import json
import pandas as pd
from sentence_transformers import SentenceTransformer

from app.dim_reduction import reduce_to_3d
from app.clustering import find_clusters
from app.history_nlp import load_and_clean_chrome_history, generate_embeddings
from app.pipelinecache import PipelineCache

global_cache = PipelineCache()

def run_cluster_pipeline(eps=0.3, min_samples=3):
    df = global_cache.raw_data
    coords_3d = global_cache.coords_3d
    cluster_labels = find_clusters(coords_3d, eps=eps, min_samples=min_samples)

    output_nodes = []
    for i, (original_idx, row) in enumerate(df.iterrows()):
        node = {
            "id": i,
            "cluster": int(cluster_labels[i])
        }
        output_nodes.append(node)
        
    print(f"Successfully processed {len(output_nodes)} nodes.")
    return output_nodes

def run_full_pipeline(file_path: str, max_items: int = 2000, n_neighbors=15, min_dist=0.1, seed=42, eps=0.3, min_samples=3):
    
    umap_needs_recalc = (
        max_items != global_cache.max_items or
        n_neighbors != global_cache.last_umap_params["n_neighbors"] or
        min_dist != global_cache.last_umap_params["min_dist"] or
        seed != global_cache.last_umap_params["seed"] or
        seed == -1
    )

    if max_items != global_cache.max_items:
        df = load_and_clean_chrome_history(file_path, max_items)
        embeddings = generate_embeddings(df)
        global_cache.update_data(max_items, df, embeddings)
    else:
        df = global_cache.raw_data
        embeddings = global_cache.embeddings

    if umap_needs_recalc:
        coords_3d = reduce_to_3d(embeddings, n_neighbors=n_neighbors, min_dist=min_dist, seed=seed)
        global_cache.update_umap(n_neighbors, min_dist, seed, coords_3d)
    else:
        coords_3d = global_cache.coords_3d


    cluster_labels = find_clusters(coords_3d, eps=eps, min_samples=min_samples)

    output_nodes = []
    for i, (original_idx, row) in enumerate(df.iterrows()):
        node = {
            "id": i,
            "title": str(row['title']),
            "url": str(row['url']),
            "x": float(coords_3d[i, 0]),
            "y": float(coords_3d[i, 1]),
            "z": float(coords_3d[i, 2]),
            "cluster": int(cluster_labels[i])
        }
        output_nodes.append(node)
        
    print(f"Successfully processed {len(output_nodes)} nodes.")
    return output_nodes