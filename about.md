# About — Project Flow and Purpose

This document visually represents the data and model flow in this repository and explains what each component does.

```mermaid
flowchart LR
    A[rumor_dataset.csv / Raw data] --> B[dataset_generator.py]
    B --> C[feature_extractor.py]
    C --> D[train_model.py]
    D --> E[Serialized model (eg. model.pkl)]
    E --> F[app.py (Flask) -> prediction API]
    F --> G[templates/ & static/ UI]
    style A fill:#f9f,stroke:#333,stroke-width:1px
    style E fill:#bfe,stroke:#333,stroke-width:1px
    style G fill:#efe,stroke:#333,stroke-width:1px
```

## Component responsibilities

- dataset_generator.py: prepare or augment the raw dataset; cleaning, splitting, formatting.
- feature_extractor.py: compute numeric/textual/graph features used for learning.
- train_model.py: train a classifier, evaluate, and serialize the trained model for inference.
- app.py: load the serialized model, expose endpoints for single predictions and batch comparisons, and serve the web UI.
- templates/ + static/: the frontend that allows interactive inspection and comparison of predictions.

## How the pipeline is typically used

1. Use `dataset_generator.py` to produce or update `rumor_dataset.csv`.
2. Run `feature_extractor.py` to compute features suitable for modeling.
3. Train models with `train_model.py`; adjust features and hyperparameters to iterate.
4. Start the web server with `app.py` to visualize results and test model behaviour on new examples.

## Intended audience

Researchers, students, and engineers who want a compact, understandable demonstration of rumor detection on graph-like propagation data. The code favors clarity and extensibility over production robustness.
