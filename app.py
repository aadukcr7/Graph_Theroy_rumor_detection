"""Flask application for the structural diffusion analysis demo.

The API exposes a prediction endpoint and serves a single-page visualization
that demonstrates the graph features used by the classifier.
"""

from __future__ import annotations

import pickle
from pathlib import Path

import numpy as np
import pandas as pd
from flask import Flask, jsonify, render_template, request

from dataset_generator import build_dataset, generate_graph, graph_to_payload
from feature_extractor import FEATURE_COLUMNS
from train_model import train_and_save_model


MODEL_FILE = Path("rumor_model.pkl")
DATASET_FILE = Path("rumor_dataset.csv")

app = Flask(__name__)


def ensure_artifacts() -> dict:
    """Load the trained model bundle, training it if necessary."""

    if not DATASET_FILE.exists():
        dataset = build_dataset()
        dataset.to_csv(DATASET_FILE, index=False)

    if not MODEL_FILE.exists():
        return train_and_save_model(DATASET_FILE, MODEL_FILE)

    with MODEL_FILE.open("rb") as file_handle:
        return pickle.load(file_handle)


MODEL_BUNDLE = ensure_artifacts()
MODEL = MODEL_BUNDLE["model"]
MODEL_FEATURE_COLUMNS = MODEL_BUNDLE["feature_columns"]
FEATURE_DEFAULTS = MODEL_BUNDLE["feature_defaults"]


@app.route("/")
def index():
    """Render the local graph visualization dashboard."""

    return render_template("index.html")


@app.route("/about")
def about():
    """Render the project description page."""

    return render_template("about.html")


@app.route("/compare")
def compare():
    """Render the rumor versus organic comparison page."""

    return render_template("compare.html")


@app.route("/predict", methods=["POST"])
def predict():
    """Predict rumor likelihood from graph features.

    The request may contain only a subset of fields. Missing values are filled
    from the training-set averages stored in the model bundle.
    """

    payload = request.get_json(silent=True) or {}

    feature_row = {}
    for column in MODEL_FEATURE_COLUMNS:
        value = payload.get(column, FEATURE_DEFAULTS.get(column, 0.0))
        try:
            feature_row[column] = float(value)
        except (TypeError, ValueError):
            feature_row[column] = float(FEATURE_DEFAULTS.get(column, 0.0))

    frame = pd.DataFrame([feature_row], columns=MODEL_FEATURE_COLUMNS)
    prediction = MODEL.predict(frame)[0]

    if hasattr(MODEL, "predict_proba"):
        confidence = float(np.max(MODEL.predict_proba(frame)))
    else:
        confidence = 0.0

    return jsonify({"prediction": prediction, "confidence": round(confidence, 4)})


@app.route("/generate-graph", methods=["POST"])
def generate_graph_endpoint():
    """Generate a new propagation tree from the local synthetic dataset logic."""

    payload = request.get_json(silent=True) or {}
    label = str(payload.get("label", "rumor"))

    try:
        vertex_count = int(payload.get("vertices", 12))
    except (TypeError, ValueError):
        vertex_count = 12

    graph = generate_graph(label, vertex_count)
    graph_payload = graph_to_payload(graph, label=label)

    frame = pd.DataFrame([graph_payload["features"]], columns=MODEL_FEATURE_COLUMNS)
    prediction = MODEL.predict(frame)[0]
    confidence = float(np.max(MODEL.predict_proba(frame))) if hasattr(MODEL, "predict_proba") else 0.0

    return jsonify(
        {
            "label": label,
            "prediction": prediction,
            "confidence": round(confidence, 4),
            "graph": graph_payload,
        }
    )


if __name__ == "__main__":
    app.run(debug=True)
