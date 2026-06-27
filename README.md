# Structural Diffusion Analysis

This project is a graph-theory based rumor detection demo. It builds synthetic propagation trees, extracts interpretable structural and temporal features, and uses a RandomForestClassifier to predict whether a cascade looks rumor-like or organic.

## What It Does

- Generates 500 rumor cascades and 500 organic cascades with NetworkX.
- Assigns each edge a delay, timestamp, and temporal weight.
- Trains a RandomForest model on 18 hand-crafted graph features.
- Serves a Flask web app with a live propagation graph, a comparison page, and an About page.
- Exposes prediction and graph-generation endpoints for the frontend.

## Project Layout

| File | Purpose |
| --- | --- |
| `dataset_generator.py` | Builds synthetic rumor and organic propagation trees and writes `rumor_dataset.csv`. |
| `feature_extractor.py` | Computes graph-theoretic and temporal features from each cascade. |
| `train_model.py` | Trains the classifier and saves `rumor_model.pkl`. |
| `app.py` | Loads the model bundle and serves the Flask routes and API endpoints. |
| `templates/` | HTML templates for the home, about, and compare pages. |
| `static/` | CSS and JavaScript for the D3 visualization and UI. |

## Model Features

The classifier uses these 18 features:

1. nodes
2. edges
3. avg_degree
4. max_degree
5. density
6. diameter
7. radius
8. clustering
9. avg_shortest_path
10. degree_centrality_mean
11. degree_centrality_max
12. betweenness_mean
13. closeness_mean
14. centralization
15. avg_temporal_weight
16. diffusion_speed
17. branching_factor
18. leaf_ratio

The feature extractor also computes a readable graph center label for the dashboard, although that value is not used by the classifier.

## Graph Logic

Rumor graphs are generated as star-like, hub-heavy, or branched trees with short propagation delays. Organic graphs are generated as path-like, sparse, or lightly branched trees with longer delays.

Each edge stores:

- `delay`: propagation delay between parent and child
- `timestamp`: cumulative time at the child node
- `weight`: temporal edge weight computed as `1 / ln(1 + delta_t)`

Node `0` is the source vertex in every generated graph. In the UI it is highlighted as `Source`.

## Web UI

The home page renders a D3 force-directed graph, shows prediction confidence, and exposes zoom and drag controls. Hovering an edge shows delay, stored weight, and the weight formula. The compare page renders a rumor example and an organic example side by side so the structural differences are easy to inspect.

## API Endpoints

- `POST /predict` accepts a partial feature payload and fills missing fields with training-set means.
- `POST /generate-graph` creates a new synthetic graph, computes its features, and returns the graph payload plus a prediction.

## Installation

Windows PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

macOS or Linux:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Run Locally

1. Generate the dataset if needed:

```bash
python dataset_generator.py
```

2. Train the model:

```bash
python train_model.py
```

3. Start the Flask app:

```bash
python app.py
```

4. Open http://127.0.0.1:5000 in a browser.

## Notes

- The project is intentionally not a graph neural network.
- It is designed for explainable graph theory demonstrations and classroom-style analysis.
- The model bundle is stored in `rumor_model.pkl`, and the generated dataset is stored in `rumor_dataset.csv`.
