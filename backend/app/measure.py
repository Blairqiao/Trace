from sklearn.manifold import trustworthiness
from sklearn.preprocessing import normalize
import numpy as np

def measure_trustworthiness(embeddings, coords_3d, max_items, k=10):
    """
    Calculates the trustworthiness of a low-dimensional embedding.
    """
    max_size = 5000
    embeddings = normalize(embeddings[:max_items], norm='l2')

    if max_items > max_size:
        indices = np.random.choice(embeddings.shape[0], max_size, replace=False)
        embeddings = embeddings[indices]
        coords_3d = coords_3d[indices]

        del indices
    
    score = trustworthiness(embeddings, coords_3d, n_neighbors=k, metric="cosine")

    del embeddings, coords_3d

    return round(score * 100, 2)