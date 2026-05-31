import os
import json
import pandas as pd
from sentence_transformers import SentenceTransformer

from app.dim_reduction import reduce_to_3d
from app.clustering import find_clusters
from app.history_nlp import load_and_clean_chrome_history, generate_embeddings

def run_dbscan(df, coords_3d, max_items=1500, eps=0.3, min_samples=3):
    cluster_labels = find_clusters(coords_3d, eps=eps, min_samples=min_samples)

    output_nodes = []
    for i, (original_idx, row) in enumerate(df.iloc[:max_items].iterrows()):
        node = {
            "id": i,
            "cluster": int(cluster_labels[i])
        }
        output_nodes.append(node)
        
    return output_nodes

def run_umap_dbscan(df, embeddings, max_items=1500, n_neighbors=15, min_dist=0.1, seed=42, eps=0.3, min_samples=3):
    coords_3d = reduce_to_3d(embeddings[:max_items], n_neighbors=n_neighbors, min_dist=min_dist, seed=seed)
    cluster_labels = find_clusters(coords_3d, eps=eps, min_samples=min_samples)

    output_nodes = []
    for i, (original_idx, row) in enumerate(df.iloc[:max_items].iterrows()):
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
        
    return output_nodes, coords_3d

