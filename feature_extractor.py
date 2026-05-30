"""Graph feature extraction helpers for rumor detection.

This module converts a propagation tree into graph-theoretic and temporal
features. The project is intentionally not a graph neural network; instead it
uses interpretable structural measures that are suitable for a final-year
undergraduate graph theory project.
"""

from __future__ import annotations

import math
from typing import Dict, Iterable

import networkx as nx
import numpy as np


FEATURE_COLUMNS = [
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
]


def _as_undirected_connected_graph(graph: nx.Graph) -> nx.Graph:
    """Return a connected undirected view of the graph.

    The generated propagation trees are connected, but the helper remains
    defensive so the training pipeline does not break if a custom graph is
    passed in later.
    """

    base_graph = graph.to_undirected() if graph.is_directed() else graph.copy()
    if base_graph.number_of_nodes() == 0:
        return base_graph

    if nx.is_connected(base_graph):
        return base_graph

    largest_nodes = max(nx.connected_components(base_graph), key=len)
    return base_graph.subgraph(largest_nodes).copy()


def _safe_average(values: Iterable[float]) -> float:
    values = list(values)
    if not values:
        return 0.0
    return float(np.mean(values))


def _compute_degree_centralization(graph: nx.Graph) -> float:
    """Compute Freeman-style degree centralization.

    The value is normalized to the range [0, 1] for connected simple graphs.
    Star-like trees approach 1, while path-like trees are much lower.
    """

    node_count = graph.number_of_nodes()
    if node_count < 3:
        return 0.0

    degree_centrality = nx.degree_centrality(graph)
    max_centrality = max(degree_centrality.values())
    numerator = sum(max_centrality - value for value in degree_centrality.values())
    return float(numerator / (node_count - 2))


def compute_graph_features(graph: nx.Graph) -> Dict[str, float | str]:
    """Extract the feature vector used by the classifier.

    The temporal metrics are read from edge attributes:
    - delay: propagation delay between parent and child
    - weight: temporal edge weight computed with 1 / log(1 + delay)
    - timestamp: cumulative propagation timestamp
    """

    if graph.number_of_nodes() == 0:
        empty_features: Dict[str, float | str] = {column: 0.0 for column in FEATURE_COLUMNS}
        empty_features["center"] = "-"
        return empty_features

    undirected = _as_undirected_connected_graph(graph)
    node_count = undirected.number_of_nodes()
    edge_count = undirected.number_of_edges()

    if node_count == 0:
        empty_features: Dict[str, float | str] = {column: 0.0 for column in FEATURE_COLUMNS}
        empty_features["center"] = "-"
        return empty_features

    degrees = dict(undirected.degree())
    degree_values = list(degrees.values())
    degree_centrality = nx.degree_centrality(undirected)
    betweenness = nx.betweenness_centrality(undirected, normalized=True)
    closeness = nx.closeness_centrality(undirected)

    if node_count > 1 and nx.is_connected(undirected):
        diameter = float(nx.diameter(undirected))
        radius = float(nx.radius(undirected))
        center_nodes = nx.center(undirected)
        avg_shortest_path = float(nx.average_shortest_path_length(undirected))
    else:
        diameter = 0.0
        radius = 0.0
        center_nodes = []
        avg_shortest_path = 0.0

    center = ", ".join("Source" if node == 0 else f"V{node}" for node in center_nodes) if center_nodes else "-"

    temporal_weights = []
    temporal_delays = []
    for _, _, data in graph.edges(data=True):
        if "weight" in data:
            temporal_weights.append(float(data["weight"]))
        if "delay" in data:
            temporal_delays.append(float(data["delay"]))

    avg_temporal_weight = _safe_average(temporal_weights)
    mean_delay = _safe_average(temporal_delays)
    diffusion_speed = float(1.0 / (mean_delay + 1e-9)) if mean_delay > 0 else 0.0

    if graph.is_directed():
        out_degrees = dict(graph.out_degree())
        internal_nodes = [node for node, degree in out_degrees.items() if degree > 0]
        branching_factor = _safe_average(out_degrees[node] for node in internal_nodes)
        leaf_ratio = float(sum(1 for degree in out_degrees.values() if degree == 0) / node_count)
    else:
        internal_nodes = [node for node, degree in degrees.items() if degree > 0]
        branching_factor = _safe_average(degrees[node] for node in internal_nodes)
        leaf_ratio = float(sum(1 for degree in degrees.values() if degree == 1) / node_count)

    features = {
        "nodes": float(node_count),
        "edges": float(edge_count),
        "avg_degree": float(np.mean(degree_values)) if degree_values else 0.0,
        "max_degree": float(max(degree_values)) if degree_values else 0.0,
        "density": float(nx.density(undirected)),
        "diameter": diameter,
        "radius": radius,
        "center": center,
        "clustering": float(nx.average_clustering(undirected)),
        "avg_shortest_path": avg_shortest_path,
        "degree_centrality_mean": _safe_average(degree_centrality.values()),
        "degree_centrality_max": float(max(degree_centrality.values())) if degree_centrality else 0.0,
        "betweenness_mean": _safe_average(betweenness.values()),
        "closeness_mean": _safe_average(closeness.values()),
        "centralization": _compute_degree_centralization(undirected),
        "avg_temporal_weight": avg_temporal_weight,
        "diffusion_speed": diffusion_speed,
        "branching_factor": float(branching_factor),
        "leaf_ratio": leaf_ratio,
    }

    return features


def compute_edge_weight(delay: float) -> float:
    """Temporal weighting function from the project specification."""

    return float(1.0 / math.log1p(delay)) if delay > 0 else 0.0
