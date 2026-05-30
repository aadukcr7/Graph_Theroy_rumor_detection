"""Train the rumor vs organic propagation classifier.

The classifier is intentionally a RandomForest rather than a graph neural
network. The project is about graph-theoretic feature engineering, so the model
consumes hand-crafted structural and temporal descriptors.
"""

from __future__ import annotations

import argparse
import pickle
from pathlib import Path

import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.model_selection import train_test_split

from dataset_generator import build_dataset
from feature_extractor import FEATURE_COLUMNS


DATASET_FILE = Path("rumor_dataset.csv")
MODEL_FILE = Path("rumor_model.pkl")


def load_dataset(dataset_path: Path = DATASET_FILE) -> pd.DataFrame:
    if dataset_path.exists():
        return pd.read_csv(dataset_path)

    dataset = build_dataset()
    dataset.to_csv(dataset_path, index=False)
    return dataset


def train_and_save_model(dataset_path: Path = DATASET_FILE, model_path: Path = MODEL_FILE):
    dataset = load_dataset(dataset_path)

    X = dataset[FEATURE_COLUMNS]
    y = dataset["label"]

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42,
        stratify=y,
    )

    model = RandomForestClassifier(
        n_estimators=300,
        random_state=42,
        class_weight="balanced",
    )
    model.fit(X_train, y_train)

    predictions = model.predict(X_test)

    accuracy = accuracy_score(y_test, predictions)
    precision = precision_score(y_test, predictions, pos_label="rumor")
    recall = recall_score(y_test, predictions, pos_label="rumor")
    f1 = f1_score(y_test, predictions, pos_label="rumor")
    matrix = confusion_matrix(y_test, predictions, labels=["organic", "rumor"])

    print("Model evaluation")
    print(f"Accuracy : {accuracy:.4f}")
    print(f"Precision: {precision:.4f}")
    print(f"Recall   : {recall:.4f}")
    print(f"F1 Score : {f1:.4f}")
    print("Confusion Matrix [organic, rumor]:")
    print(matrix)

    feature_importance = pd.Series(model.feature_importances_, index=FEATURE_COLUMNS).sort_values(ascending=False)
    print("\nFeature importance ranking")
    for feature_name, score in feature_importance.items():
        print(f"{feature_name:28s} {score:.4f}")

    bundle = {
        "model": model,
        "feature_columns": FEATURE_COLUMNS,
        "feature_defaults": X.mean().to_dict(),
    }

    with model_path.open("wb") as file_handle:
        pickle.dump(bundle, file_handle)

    print(f"\nSaved model bundle to {model_path.resolve()}")
    return bundle


def main() -> None:
    parser = argparse.ArgumentParser(description="Train the rumor detection model.")
    parser.add_argument("--dataset", default=str(DATASET_FILE), help="Input CSV dataset.")
    parser.add_argument("--model", default=str(MODEL_FILE), help="Output model pickle.")
    args = parser.parse_args()

    train_and_save_model(Path(args.dataset), Path(args.model))


if __name__ == "__main__":
    main()
