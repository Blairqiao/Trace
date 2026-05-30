import umap
from sklearn.preprocessing import StandardScaler

def reduce_to_3d(embeddings, n_neighbors=15, min_dist=0.1, seed=42):
    """
    Takes a high-dimensional vector matrix and compresses it to 3 dimensions (X, Y, Z).
    """
    # Initialize the UMAP reducer
    # We set a random_state so the 3D map looks the same every time you reload the page during testing
    reducer = umap.UMAP(
        n_neighbors=n_neighbors, 
        min_dist=min_dist, 
        n_components=3,
        random_state=seed
    )
    
    # It is best practice to standardize data before passing it into UMAP
    scaled_embeddings = StandardScaler().fit_transform(embeddings)
    
    # Perform the mathematical compression
    coords_3d = reducer.fit_transform(scaled_embeddings)
    
    return coords_3d