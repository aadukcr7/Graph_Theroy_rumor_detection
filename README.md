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
