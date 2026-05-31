from sklearn.cluster import DBSCAN

def find_clusters(coords_3d, eps=0.3, min_samples=3):
    """
    Takes 3D spatial coordinates and assigns a cluster ID to each point.
    Points that do not fit into a dense neighborhood are labeled as -1 (Noise).
    """

    clusterer = DBSCAN(
        eps=eps, 
        min_samples=min_samples
    )
    
    cluster_labels = clusterer.fit_predict(coords_3d)
    
    return cluster_labels