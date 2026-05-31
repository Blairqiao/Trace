import umap
from sklearn.preprocessing import StandardScaler

def reduce_to_3d(embeddings, n_neighbors=15, min_dist=0.1, seed=42):
    """
    Takes a high-dimensional vector matrix and compresses it to 3 dimensions (X, Y, Z).
    """

    if seed == -1:
        seed = None

    reducer = umap.UMAP(
        n_neighbors=n_neighbors, 
        min_dist=min_dist, 
        n_components=3,
        random_state=seed
    )
    
    scaled_embeddings = StandardScaler().fit_transform(embeddings)
    
    coords_3d = reducer.fit_transform(scaled_embeddings)
    
    return coords_3d