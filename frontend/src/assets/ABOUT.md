# About Trace

Welcome to Trace, a real-time 3D visualization dashboard designed to convert your standard, linear Google Chrome browsing history into an interactive, semantic point-cloud galaxy. 

While a normal scroll through your search history might seem like a jumbled mess of unrelated ideas, Trace reveals the hidden structure of your digital footprint. By utilizing machine learning, it allows you to visually explore your research rabbit holes, recurring interests, and how your ideas connect in 3D space.

<strong style="color: #ff477e;">Privacy First:</strong>
<span style="margin-left: 4px;">Trace is 100% private. It uses your local browser storage and the backend server's RAM to process your data. Trace will NEVER record, store, or sell your data.</span>

---

## Parameter Tuning
Because everyone's browsing history is completely unique in density and scope, one set of mathematical parameters will not work for all datasets. You can open the Settings menu to fine-tune exactly how your galaxy forms:

### Galaxy Controls (UMAP)
These sliders control the underlying mathematical shape of your data.
* **Node Count:** The maximum number of unique history nodes processed and rendered.
* **Topic Broadness (Neighbors):** Determines the specificity of relationships. Low values focus on very local, tight relationships (creating isolated clumps), while high values look at the broader, overarching structure of your history.
* **Repulsion Factor (Min Distance):** Controls how tightly points are allowed to pack together. Low values result in dense, tight clusters, while higher values spread the nodes out for easier individual selection.
* **Random Seed:** The default is `-1` (entirely random), but a specific integer can be set to generate reproducible results.

### Cluster Settings (DBSCAN)
These sliders control how the colors and groupings are calculated.
* **Cluster Radius (Epsilon):** The maximum distance between two nodes for them to be considered part of the same semantic "neighborhood."
* **Minimum Cluster Size:** The absolute minimum number of closely packed nodes required to spawn a new color-coded cluster.

### Visual Aesthetics
* **Node Size & Glow Intensity:** Controls the physical size and neon bloom of the rendered points. *(Note: high glow intensity may make nodes appear larger than their actual clickable hitbox).*
* **Galaxy Scale:** Controls the visual spread of the galaxy in your browser without actually altering the underlying mathematical coordinates.

---

## System Architecture & Data Pipeline
Transforming a raw Chrome History file into a real-time interactive galaxy requires a robust full-stack pipeline capable of handling heavy matrix math and high-dimensional clustering.

1. **Client-Side Ingestion:** The user uploads a Chrome History JSON via the Vite frontend.
2. **Reverse Proxy:** The payload passes through an Nginx reverse proxy hosted on a DigitalOcean Droplet
3. **Semantic Embedding:** The FastAPI backend parses the history and utilizes HuggingFace Transformers to convert the page titles into high-dimensional vector embeddings, capturing the "meaning" of each webpage. *(Note: Trace calculates semantic relationships purely from the page titles, rather than scraping or reading the actual content of the websites)*
4. **Dimensionality Reduction:** The vectors are fed into a UMAP engine, compressing the high-dimensional data down into `float32` 3D Cartesian coordinates (x, y, z) while preserving local and global data structure.
5. **Semantic Clustering:** The coordinates are processed by DBSCAN to group similar nodes into color-coded neighborhoods and flag unrelated points as noise.
6. **Client Rendering:** The math is sent back to the browser, where Three.js mounts the points into a 3D scene using custom WebGL fragment and vertex shaders to generate performant, bloom-like neon nodes.

---

## Attributions & Open Source
Trace is an open-source tool licensed under the **AGPL-3.0 License**. It is made possible by the incredible work of the open-source community:

* **[Three.js](https://threejs.org/)** - The core WebGL engine powering the 3D rendering.
* **[Vite](https://vitejs.dev/)** - The frontend build tool and development server.
* **[FastAPI](https://fastapi.tiangolo.com/)** - The high-performance Python web framework handling routing.
* **[UMAP-Learn](https://umap-learn.readthedocs.io/)** - The dimensionality reduction library by Leland McInnes.
* **[Hugging Face](https://huggingface.co/transformers/)** - The backbone of the semantic text embedding pipeline.

### About the Developer
Trace is built and maintained by Blair Qiao, a Computer Science student at the University of Texas at Austin. The project was driven by a fascination with the data we leave behind every day, built specifically to help people discover the unintuitive patterns buried within their daily digital lives.

* 💻 **Source Code:** [View the repository on GitHub](https://github.com/Blairqiao)
* 📬 **Contact:** yanzhe.qiao.1@gmail.com