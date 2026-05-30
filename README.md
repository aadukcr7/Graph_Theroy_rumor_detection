# Structural Diffusion Analysis — Rumor Detection

A small interactive demo showcasing how propagation structure can help detect rumors using graph features and a heuristic that mimics a Graph Convolutional Network (GCN) classifier.

## What this project is

- Single-file demo (`rumor_detection.html`) built with D3.js.
- Lets you generate synthetic propagation trees (rumor-like star structures or organic chain-like structures), visualize the graph, compute simple structural metrics, and produce a heuristic prediction.

## How to use

1. Open `rumor_detection.html` in a modern browser (double-click or use `Live Server`).
2. Use the controls in the *Interactive Demo* section:
   - Toggle between **Rumor** and **Organic** propagation modes.
   - Adjust **Nodes** and **Avg Δt (hours)** then click **Generate Random Graph**.
   - Drag nodes to explore the layout and scroll to zoom.

## Controls & Output

- Nodes / Edges / Avg Degree / Diameter / Avg Edge Weight / Density: basic structural metrics shown below the canvas.
- GCN Prediction: a heuristic score shown as a progress bar indicating the likelihood of the graph being a rumor.

## Heuristic used for prediction

The demo uses a lightweight heuristic in `computeRumorScore()` combining:
- Average degree (higher favors rumor)
- Diameter (smaller favors rumor)
- Average temporal edge weight (faster reposts favor rumor)

These components are weighted and clamped to produce a score between 0.02 and 0.98.

## Code notes & changes

- The demo is entirely client-side (no backend). Open the HTML file to run it.
- I improved the node tooltip behavior to position correctly even when zooming/panning, and made tooltip follow the pointer for better UX.

## Development suggestions

- Extract JS into a separate file for maintainability.
- Replace heuristic with a trained GCN model (server-hosted or WebAssembly) for realistic results.
- Add unit tests for metric computations and modularise functions.

If you'd like, I can:
- Add a build/test setup
- Extract JS into `src/` and create a small dev server
- Integrate a pretrained model for real predictions

GCN Prototype
-------------
I added a prototype GCN trainer `train_gcn.py` that uses PyTorch Geometric to train a graph-level GCN on the JSON datasets in `data/`. Installing PyTorch and PyG requires following their platform-specific instructions — see `requirements_gcn.txt` for guidance.

Quick start for GCN (after installing dependencies):
```
python train_gcn.py --data-dir data --model-out models/gcn.pth --epochs 50
```

The script uses simple node features (degree, minutes since source). It's a starting point — to get professional results, add richer node/edge features and tune the model.

---
Authored by: UI demo authors (adapted)
