import umap

def reduce_to_3d(embeddings, n_neighbors=15, min_dist=0.1, seed=-1):
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
    
    coords_3d = reducer.fit_transform(embeddings)

    del reducer
    
    return coords_3d