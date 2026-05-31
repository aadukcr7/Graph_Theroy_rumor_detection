# Graph Theory — Rumor Detection Prototype

Professional demo project for exploring rumor detection on social graphs.

## Overview

This repository contains a small end-to-end pipeline for generating a rumor dataset, extracting features, training a classification model, and serving a simple web UI to explore predictions. It is intended as a research / teaching prototype rather than a production system.

## Key Components

- `dataset_generator.py` — scripts to create or preprocess the dataset used for experiments.
- `feature_extractor.py` — extracts graph- and text-based features used by the model.
- `train_model.py` — training script that builds and saves the classification model.
- `app.py` — Flask web application exposing a minimal UI and prediction endpoints.
- `rumor_dataset.csv` — example dataset included for convenience.
- `static/` and `templates/` — front-end assets used by the Flask app.

## Features

- End-to-end pipeline from data generation to model serving.
- Lightweight, easy-to-extend feature extraction for research experiments.
- Minimal web UI for qualitative exploration and comparison.

## Installation

Recommended: use a Python virtual environment.

On Windows (PowerShell):

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

On macOS / Linux:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Quick Usage

1. Generate or inspect the dataset (optional):

```bash
python dataset_generator.py
```

2. Extract features:

```bash
python feature_extractor.py
```

3. Train the model:

```bash
python train_model.py
```

4. Run the web app (default Flask port 5000):

```bash
python app.py
```

Then open http://127.0.0.1:5000 in your browser to interact with the UI.

## Dataset

The repository includes a sample file `rumor_dataset.csv` to get started. The dataset format and expected columns are described in the scripts, but typically contain a message id, text, propagation metadata, and a label indicating rumor / non-rumor.

## Project Structure

- `app.py` — Flask server and prediction endpoints
- `dataset_generator.py` — dataset creation / preprocessing
- `feature_extractor.py` — compute features for training and inference
- `train_model.py` — training and model serialization
- `rumor_dataset.csv` — example dataset
- `requirements.txt` — Python dependencies
- `templates/` — HTML templates for UI
- `static/` — JS/CSS frontend assets

## Extending the Project

- Swap or expand feature sets in `feature_extractor.py` to test new hypotheses.
- Add alternative models or hyperparameter search to `train_model.py`.
- Improve the web UI in `templates/` and `static/` for better exploration.

## Contributing

Contributions are welcome. Please open issues for bugs or feature requests and submit pull requests for proposed changes.

## License

This project is provided for educational purposes. Add a license file if you intend to redistribute or publish.
# Structural Diffusion Analysis for Rumor Detection using Temporal Graph Features

This is a project   graph theory system for classifying propagation trees as **rumor** or **organic information**. It is intentionally **not** a graph neural network. Instead, it uses interpretable graph-theoretic and temporal features extracted from synthetic propagation trees.

## What the project does

- Generates 500 rumor graphs and 500 organic graphs locally with NetworkX.
- Assigns timestamps and propagation delays to every edge.
- Computes temporal weights with `w(i,j) = 1 / log(1 + Δt)`.
- Trains a `RandomForestClassifier` on structural and temporal features.
- Exposes a Flask API for predictions.
- Visualizes a propagation tree with D3.js, including edge thickness and delay tooltips.

## Repository structure

- `dataset_generator.py` builds the labeled CSV dataset.
- `feature_extractor.py` computes the graph theory and temporal features.
- `train_model.py` trains the classifier and saves `rumor_model.pkl`.
- `app.py` serves the Flask app and prediction endpoint.
- `templates/index.html`, `static/css/style.css`, and `static/js/app.js` implement the frontend.

## Graph-theoretic features used

The model uses the following features:

1. Number of nodes
2. Number of edges
3. Average degree
4. Maximum degree
5. Graph density
6. Diameter
7. Radius
8. Average clustering coefficient
9. Average shortest path length
10. Degree centrality mean
11. Degree centrality maximum
12. Betweenness centrality mean
13. Closeness centrality mean
14. Graph centralization score
15. Average temporal edge weight
16. Temporal diffusion speed
17. Branching factor
18. Leaf node ratio

## Research notes

### Propagation trees
Propagation trees represent a message spreading from one source through reposts or shares. Rumors often generate star-like or hub-heavy trees, while organic information spreads in longer chains.

### Temporal weighting
The edge weight formula rewards fast reposts:

`w(i,j) = 1 / log(1 + Δt)`

Small delays produce larger weights, which helps the model detect rapid burst-like spreading.

### Degree centrality
Degree centrality measures how connected a node is relative to the rest of the graph. Rumors usually have one or a few nodes with unusually high degree centrality.

### Betweenness centrality
Betweenness centrality captures how often a node sits on shortest paths. In chain-like organic trees, more nodes may sit on the main propagation path.

### Graph density
Density measures how many edges exist compared with the maximum possible number of edges. Rumor trees often appear locally dense around the source, especially in hub-and-spoke structures.

### Diameter
Diameter is the longest shortest path in the graph. Organic cascades typically have larger diameters because they spread in longer chains.

### Diffusion speed
Diffusion speed is derived from the mean propagation delay. Fast-reposting rumor graphs produce higher diffusion speed values.

## Run locally

1. Install dependencies:

```bash
pip install -r requirements.txt
```

2. Generate the dataset:

```bash
python dataset_generator.py
```

3. Train the model:

```bash
python train_model.py
```

4. Start the Flask app:

```bash
python app.py
```

5. Open the local address shown in the terminal.

## Example prediction request

```json
{
  "avg_degree": 4.2,
  "diameter": 2,
  "density": 0.51,
  "avg_temporal_weight": 0.93,
  "centralization": 0.88,
  "leaf_ratio": 0.72
}
```

The API fills any missing features with training-set averages, then returns a prediction and confidence score.
