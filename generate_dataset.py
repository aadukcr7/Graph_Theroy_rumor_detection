#!/usr/bin/env python3
"""
Simple dataset generator for the Rumor Detection demo.

Generates synthetic propagation trees labeled as `rumor` or `organic` and
exports them as JSON files with node timestamps, edges (with dt in minutes),
and temporal weights `w = 1 / log(1 + dt_minutes)`.

Usage:
    python generate_dataset.py --mode rumor --nodes 12 --out data/dataset_rumor.json
    python generate_dataset.py --mode organic --nodes 12 --out data/dataset_organic.json
"""
import json
import math
import random
import argparse
from datetime import datetime, timedelta


def temporal_weight(dt_minutes):
    return 1.0 / math.log(1 + max(0.001, dt_minutes))


def gen_rumor(n_nodes=12, avg_dt_hours=0.5):
    # Star-like: many direct children with small dt
    nodes = []
    edges = []
    base = datetime.utcnow()
    nodes.append({"id": 0, "label": "Source", "timestamp": base.isoformat()})
    direct = max(1, int(n_nodes * 0.75))
    # direct children
    for i in range(1, direct + 1):
        dt_min = random.uniform(1, avg_dt_hours * 60) * random.uniform(0.3, 1.2)
        t = base + timedelta(minutes=dt_min)
        nodes.append({"id": i, "label": f"U{i}", "timestamp": t.isoformat()})
        w = temporal_weight(dt_min)
        edges.append({"source": 0, "target": i, "dt": round(dt_min, 3), "weight": round(w, 3)})
    # grandchildren
    for i in range(direct + 1, n_nodes):
        parent = 1 + random.randrange(0, direct)
        parent_ts = datetime.fromisoformat(nodes[parent]["timestamp"])
        dt_min = random.uniform(avg_dt_hours * 60, avg_dt_hours * 60 * 3)
        t = parent_ts + timedelta(minutes=dt_min)
        nodes.append({"id": i, "label": f"U{i}", "timestamp": t.isoformat()})
        w = temporal_weight(dt_min)
        edges.append({"source": parent, "target": i, "dt": round(dt_min, 3), "weight": round(w, 3)})
    return {"label": "rumor", "nodes": nodes, "edges": edges}


def gen_organic(n_nodes=12, avg_dt_hours=6):
    # Chain-like with occasional branching and larger dt
    nodes = []
    edges = []
    base = datetime.utcnow()
    nodes.append({"id": 0, "label": "Source", "timestamp": base.isoformat()})
    next_id = 1
    frontier = [0]
    while next_id < n_nodes:
        new_frontier = []
        for p in frontier:
            children = 1 if random.random() > 0.3 else 2
            for _ in range(children):
                if next_id >= n_nodes:
                    break
                parent_ts = datetime.fromisoformat(nodes[p]["timestamp"])
                dt_min = random.uniform(avg_dt_hours * 60 * 0.5, avg_dt_hours * 60 * 1.5)
                t = parent_ts + timedelta(minutes=dt_min)
                nodes.append({"id": next_id, "label": f"U{next_id}", "timestamp": t.isoformat()})
                w = temporal_weight(dt_min)
                edges.append({"source": p, "target": next_id, "dt": round(dt_min, 3), "weight": round(w, 3)})
                new_frontier.append(next_id)
                next_id += 1
        frontier = new_frontier
        if not frontier:
            break
    return {"label": "organic", "nodes": nodes, "edges": edges}


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--mode', choices=['rumor', 'organic'], default='rumor')
    p.add_argument('--nodes', type=int, default=12)
    p.add_argument('--avg-dt-hours', type=float, default=2.0,
                   help='Average Δt in hours (used as base for dt sampling)')
    p.add_argument('--out', type=str, default=None)
    args = p.parse_args()

    if args.mode == 'rumor':
        data = gen_rumor(n_nodes=args.nodes, avg_dt_hours=args.avg_dt_hours)
    else:
        data = gen_organic(n_nodes=args.nodes, avg_dt_hours=args.avg_dt_hours)

    out = args.out or f"data/dataset_{args.mode}.json"
    with open(out, 'w', encoding='utf-8') as fh:
        json.dump(data, fh, indent=2, ensure_ascii=False)
    print(f'Wrote {out} (label={data["label"]}, nodes={len(data["nodes"])}, edges={len(data["edges"])})')


if __name__ == '__main__':
    main()
