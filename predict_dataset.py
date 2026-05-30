"""
Load a saved baseline model and predict on a single dataset JSON.

Usage:
  python predict_dataset.py --model models/baseline.pkl --input data/dataset_rumor.json
"""
import argparse
import json
import joblib
import numpy as np

from train_baseline import compute_features


def load_model(path):
    obj = joblib.load(path)
    return obj['model'], obj['features']


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--model', default='models/baseline.pkl')
    p.add_argument('--input', required=True)
    args = p.parse_args()

    model, features = load_model(args.model)
    with open(args.input, 'r', encoding='utf-8') as fh:
        data = json.load(fh)
    feats = compute_features(data)
    x = np.array([feats[k] for k in features]).reshape(1, -1)
    pred = model.predict(x)[0]
    proba = model.predict_proba(x)[0][1]
    label = 'rumor' if pred==1 else 'organic'
    print(f'Predicted: {label} (prob={proba:.3f})')


if __name__ == '__main__':
    main()
