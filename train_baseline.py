"""
Train a simple baseline classifier (RandomForest) on JSON propagation graphs.

The script expects JSON files under `data/` with structure:
  { "label": "rumor"|"organic", "nodes": [{id,label,timestamp}], "edges": [{source,target,dt,weight}] }

Usage:
  python train_baseline.py --data-dir data --model-out models/baseline.pkl --generate 50

If there are too few datasets in `data/`, the script can auto-generate more by invoking
`generate_dataset.py`.
"""
import os
import json
import glob
import argparse
import subprocess
from collections import deque

import math
import numpy as np
import pandas as pd
import networkx as nx
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
import joblib


def compute_features(graph):
    # graph: dict with nodes and edges
    nodes = graph.get('nodes', [])
    edges = graph.get('edges', [])
    n = len(nodes)
    m = len(edges)

    # build undirected graph for structural metrics
    G = nx.Graph()
    for nd in nodes:
        G.add_node(nd['id'])
    for e in edges:
        s = e['source']
        t = e['target']
        G.add_edge(s, t)

    avg_deg = float(np.mean([d for _, d in G.degree()])) if n>0 else 0.0
    degs = np.array([d for _, d in G.degree()]) if n>0 else np.array([0])
    deg_std = float(np.std(degs))
    max_deg = int(degs.max()) if degs.size>0 else 0

    # diameter: use eccentricity if connected; otherwise approximate by largest component
    if n == 0 or m == 0:
        diameter = 0
    else:
        if nx.is_connected(G):
            diameter = nx.diameter(G)
        else:
            comp = max(nx.connected_components(G), key=len)
            diameter = nx.diameter(G.subgraph(comp))

    density = nx.density(G)

    # temporal features
    dts = [e.get('dt') for e in edges if e.get('dt') is not None]
    dts = [float(x) for x in dts if x is not None]
    avg_dt = float(np.mean(dts)) if dts else 0.0
    median_dt = float(np.median(dts)) if dts else 0.0
    avg_weight = float(np.mean([e.get('weight', 1.0/math.log(1+max(0.001,e.get('dt',1)))) for e in edges])) if edges else 0.0

    # star-likeness: proportion of nodes with depth 1 (direct child of source id 0)
    parent_counts = 0
    depth1 = 0
    for e in edges:
        if e.get('source') == 0:
            depth1 += 1
    prop_depth1 = depth1 / n if n>0 else 0.0

    features = {
        'n_nodes': n,
        'n_edges': m,
        'avg_deg': avg_deg,
        'deg_std': deg_std,
        'max_deg': max_deg,
        'diameter': diameter,
        'density': density,
        'avg_dt': avg_dt,
        'median_dt': median_dt,
        'avg_weight': avg_weight,
        'prop_depth1': prop_depth1,
    }
    return features


def load_graphs_from_dir(data_dir):
    files = glob.glob(os.path.join(data_dir, '*.json'))
    graphs = []
    for f in files:
        try:
            with open(f, 'r', encoding='utf-8') as fh:
                graphs.append(json.load(fh))
        except Exception:
            continue
    return graphs


def ensure_datasets(data_dir, min_count, generator_script):
    graphs = load_graphs_from_dir(data_dir)
    missing = max(0, min_count - len(graphs))
    if missing > 0:
        os.makedirs(data_dir, exist_ok=True)
        print(f'Generating {missing} additional datasets into {data_dir}...')
        for i in range(missing):
            mode = 'rumor' if i % 2 == 0 else 'organic'
            out = os.path.join(data_dir, f'auto_{mode}_{i}.json')
            subprocess.check_call(['python', generator_script, '--mode', mode, '--nodes', '12', '--out', out])
    return load_graphs_from_dir(data_dir)


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--data-dir', default='data')
    p.add_argument('--model-out', default='models/baseline.pkl')
    p.add_argument('--min-datasets', type=int, default=40,
                   help='Minimum number of datasets to collect (auto-generate if needed)')
    p.add_argument('--generator-script', default='generate_dataset.py')
    args = p.parse_args()

    os.makedirs(os.path.dirname(args.model_out) or '.', exist_ok=True)

    graphs = ensure_datasets(args.data_dir, args.min_datasets, args.generator_script)
    print(f'Loaded {len(graphs)} graph files from {args.data_dir}')

    X = []
    y = []
    for g in graphs:
        if 'label' not in g: continue
        feats = compute_features(g)
        X.append(list(feats.values()))
        y.append(1 if g['label'] == 'rumor' else 0)

    feature_names = list(feats.keys())
    X = np.array(X)
    y = np.array(y)

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    clf = RandomForestClassifier(n_estimators=200, random_state=42)
    clf.fit(X_train, y_train)

    y_pred = clf.predict(X_test)
    y_proba = clf.predict_proba(X_test)[:, 1]

    print('Accuracy:', accuracy_score(y_test, y_pred))
    print('Classification report:\n', classification_report(y_test, y_pred, target_names=['organic','rumor']))

    # Save model and metadata
    os.makedirs(os.path.dirname(args.model_out), exist_ok=True)
    joblib.dump({'model': clf, 'features': feature_names}, args.model_out)
    print('Saved model to', args.model_out)


if __name__ == '__main__':
    main()
