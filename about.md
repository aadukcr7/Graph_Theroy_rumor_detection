## About — Project flow and purpose

This document explains the repository's pipeline and shows a concise visual of how data moves from raw input to the web UI and predictions.

```mermaid
flowchart TD
    subgraph DATA[Data]
        A[rumor_dataset.csv<br/>(raw messages + propagation metadata)]
    end

    subgraph PREP[Preprocessing]
        B[dataset_generator.py<br/>cleaning · splits · augment]
    end

    subgraph FEAT[Features]
        C[feature_extractor.py<br/>graph/text/numeric features]
    end

    subgraph TRAIN[Training]
        D[train_model.py<br/>train · evaluate · serialize]
        E[model.pkl<br/>(serialized model)]
    end

    subgraph SERVE[Serving]
        F[app.py<br/>Flask API · load model]
        G[templates/ & static/<br/>UI for inspection & comparison]
    end

    A --> B --> C --> D --> E --> F --> G

    classDef dataStyle fill:#FFF3C4,stroke:#333,stroke-width:1px;
    classDef modelStyle fill:#DFF7DF,stroke:#333,stroke-width:1px;
    class A dataStyle;
    class E modelStyle;
```

## Component responsibilities

- `dataset_generator.py` — prepare or augment the raw dataset (cleaning, stratified splits, simple augmentation).
- `feature_extractor.py` — compute graph-based, textual and numeric features used by the model.
- `train_model.py` — train classifiers, evaluate metrics, and serialize the best-performing model for inference.
- `app.py` — load the serialized model and expose REST endpoints for single/batch predictions and comparisons.
- `templates/` and `static/` — small front-end used to visualize propagation examples and model outputs.

## Typical workflow

1. Produce or update `rumor_dataset.csv` with `dataset_generator.py`.
2. Generate features with `feature_extractor.py` and save them for training/inference.
3. Train and evaluate models using `train_model.py`; tune features and hyperparameters.
4. Start the server with `app.py` to test the serialized model via the UI or API.

## How to view the diagram

- GitHub and many editors render Mermaid diagrams inline; view this file in the repository to see the flowchart.
- In VS Code use the Markdown Preview (`Ctrl+Shift+V`) or install a Mermaid preview extension if needed.

## Intended audience

Researchers, students, and engineers looking for a compact, extensible demonstration of rumor detection on propagation/graph data. The code prioritizes clarity and reproducibility over production scaling.

## Contact & Notes

- This is a prototype: validate carefully before reusing for research with real-world data.
- If you want, I can add a screenshot of the UI, example model metrics, or expand the diagram to include sample feature names.
