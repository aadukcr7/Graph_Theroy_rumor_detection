"""Synthetic propagation tree generator for rumor detection.

The data are intentionally generated locally with NetworkX so the project can be
run without a database or external dataset. Rumor graphs favor star-like,
highly centralized structures and fast propagation, while organic graphs favor
longer chains and slower diffusion.
"""

from __future__ import annotations

import argparse
import random
from pathlib import Path
from typing import List, Tuple

import networkx as nx
import pandas as pd

from feature_extractor import compute_edge_weight, compute_graph_features


RANDOM_SEED = 42
OUTPUT_FILE = Path("rumor_dataset.csv")
RUMOR_COUNT = 500
ORGANIC_COUNT = 500


def _add_temporal_edge(graph: nx.DiGraph, parent: int, child: int, parent_time: float, delay: float) -> None:
    """Attach a child node with timestamp, delay, and temporal weight."""

    timestamp = parent_time + delay
    graph.add_edge(
        parent,
        child,
        delay=float(delay),
        timestamp=float(timestamp),
        weight=compute_edge_weight(float(delay)),
    )


def _create_star_graph(node_count: int, delay_range: Tuple[float, float]) -> nx.DiGraph:
    graph = nx.DiGraph()
    graph.add_node(0, timestamp=0.0)
    for child in range(1, node_count):
        delay = random.uniform(*delay_range)
        _add_temporal_edge(graph, 0, child, 0.0, delay)
    return graph


def _create_hub_and_spoke_tree(node_count: int, delay_range: Tuple[float, float]) -> nx.DiGraph:
    graph = nx.DiGraph()
    graph.add_node(0, timestamp=0.0)
    next_node = 1

    hub_count = min(max(2, node_count // 8), max(2, node_count - 1))
    hubs: List[int] = []

    for _ in range(hub_count):
        if next_node >= node_count:
            break
        hub = next_node
        next_node += 1
        hubs.append(hub)
        delay = random.uniform(*delay_range)
        _add_temporal_edge(graph, 0, hub, 0.0, delay)

    while next_node < node_count:
        parent = random.choice([0] + hubs)
        delay_parent = graph.edges[0, parent]["timestamp"] if parent != 0 else 0.0
        child = next_node
        next_node += 1
        delay = random.uniform(*delay_range)
        _add_temporal_edge(graph, parent, child, delay_parent, delay)

    return graph


def _create_branched_tree(node_count: int, delay_range: Tuple[float, float], branch_range: Tuple[int, int]) -> nx.DiGraph:
    graph = nx.DiGraph()
    graph.add_node(0, timestamp=0.0)
    frontier = [(0, 0.0)]
    next_node = 1

    while next_node < node_count and frontier:
        parent, parent_time = frontier.pop(0)
        children_to_create = random.randint(*branch_range)
        for _ in range(children_to_create):
            if next_node >= node_count:
                break
            child = next_node
            next_node += 1
            delay = random.uniform(*delay_range)
            _add_temporal_edge(graph, parent, child, parent_time, delay)
            frontier.append((child, parent_time + delay))

    while next_node < node_count:
        parent, parent_time = random.choice(list(graph.nodes(data=True)))
        parent_time = float(parent_time.get("timestamp", 0.0))
        child = next_node
        next_node += 1
        delay = random.uniform(*delay_range)
        _add_temporal_edge(graph, parent, child, parent_time, delay)

    return graph


def _create_path_graph(node_count: int, delay_range: Tuple[float, float]) -> nx.DiGraph:
    graph = nx.DiGraph()
    graph.add_node(0, timestamp=0.0)
    current_time = 0.0
    for node in range(1, node_count):
        delay = random.uniform(*delay_range)
        _add_temporal_edge(graph, node - 1, node, current_time, delay)
        current_time += delay
    return graph


def _create_sparse_tree(node_count: int, delay_range: Tuple[float, float]) -> nx.DiGraph:
    graph = nx.DiGraph()
    graph.add_node(0, timestamp=0.0)
    frontier = [(0, 0.0)]
    next_node = 1

    while next_node < node_count and frontier:
        parent, parent_time = frontier.pop(0)
        # Keep the structure thin: most nodes produce one child, and only some
        # create a second branch. This mimics slower organic diffusion.
        child_count = 1 if random.random() < 0.8 else 2
        for _ in range(child_count):
            if next_node >= node_count:
                break
            child = next_node
            next_node += 1
            delay = random.uniform(*delay_range)
            _add_temporal_edge(graph, parent, child, parent_time, delay)
            frontier.append((child, parent_time + delay))

    while next_node < node_count:
        parent, parent_data = random.choice(list(graph.nodes(data=True)))
        parent_time = float(parent_data.get("timestamp", 0.0))
        child = next_node
        next_node += 1
        delay = random.uniform(*delay_range)
        _add_temporal_edge(graph, parent, child, parent_time, delay)

    return graph


def generate_rumor_graph() -> nx.DiGraph:
    node_count = random.randint(12, 35)
    graph_type = random.choice(["star", "hub", "branched"])

    if graph_type == "star":
        return _create_star_graph(node_count, (0.5, 2.0))
    if graph_type == "hub":
        return _create_hub_and_spoke_tree(node_count, (0.5, 2.5))
    return _create_branched_tree(node_count, (0.5, 2.2), (2, 4))


def generate_organic_graph() -> nx.DiGraph:
    node_count = random.randint(12, 35)
    graph_type = random.choice(["path", "sparse", "chain"])

    if graph_type == "path":
        return _create_path_graph(node_count, (3.0, 8.0))
    if graph_type == "sparse":
        return _create_sparse_tree(node_count, (2.5, 7.5))
    return _create_branched_tree(node_count, (3.0, 9.0), (1, 2))


def build_dataset(rumor_count: int = RUMOR_COUNT, organic_count: int = ORGANIC_COUNT) -> pd.DataFrame:
    """Generate the full labeled dataset and return it as a DataFrame."""

    random.seed(RANDOM_SEED)

    rows = []

    for _ in range(rumor_count):
        graph = generate_rumor_graph()
        features = compute_graph_features(graph)
        features["label"] = "rumor"
        rows.append(features)

    for _ in range(organic_count):
        graph = generate_organic_graph()
        features = compute_graph_features(graph)
        features["label"] = "organic"
        rows.append(features)

    dataset = pd.DataFrame(rows)
    dataset = dataset[
        [
            "nodes",
            "edges",
            "avg_degree",
            "max_degree",
            "density",
            "diameter",
            "radius",
            "clustering",
            "avg_shortest_path",
            "degree_centrality_mean",
            "degree_centrality_max",
            "betweenness_mean",
            "closeness_mean",
            "centralization",
            "avg_temporal_weight",
            "diffusion_speed",
            "branching_factor",
            "leaf_ratio",
            "label",
        ]
    ]
    return dataset


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate the rumor detection dataset.")
    parser.add_argument("--output", default=str(OUTPUT_FILE), help="CSV file to write.")
    args = parser.parse_args()

    dataset = build_dataset()
    output_path = Path(args.output)
    dataset.to_csv(output_path, index=False)
    print(f"Saved {len(dataset)} labeled graphs to {output_path.resolve()}")


if __name__ == "__main__":
    main()
