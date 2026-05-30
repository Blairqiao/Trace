class PipelineCache:
    def __init__(self):
        self.max_items = None
        self.raw_data = None
        self.embeddings = None

        self.last_umap_params = {
            "n_neighbors": None,
            "min_dist": None,
            "seed": None
        }

        self.coords_3d = None

    def update_umap(self, n_neighbors, min_dist, seed, coords_3d):
        self.last_umap_params = {
            "n_neighbors": n_neighbors,
            "min_dist": min_dist,
            "seed": seed
        }

        self.coords_3d = coords_3d
    
    def update_data(self, max_items, raw_data, embeddings):
        self.max_items = max_items
        self.raw_data = raw_data
        self.embeddings = embeddings
