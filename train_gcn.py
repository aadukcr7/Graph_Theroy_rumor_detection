"""
Train a simple Graph Convolutional Network (GCN) for graph-level classification
using PyTorch Geometric. This script converts the JSON datasets under `data/`
into PyG `Data` objects and trains a small GCN with global pooling.

Requirements:
  - torch (install from https://pytorch.org for your CUDA/CPU setup)
  - torch-geometric and its dependencies (see https://pytorch-geometric.readthedocs.io)

Usage example (after installing dependencies):
  python train_gcn.py --data-dir data --model-out models/gcn.pth --epochs 50 --batch 16

Note: This is a prototype to get you started. Node features used here are simple
degree and time-since-source; you should add richer node/edge features for production.
"""
import os
import glob
import json
import argparse
from datetime import datetime

import torch
import torch.nn.functional as F
from torch import nn
from torch_geometric.data import Data, DataLoader
from torch_geometric.nn import GCNConv, global_mean_pool


def load_graphs(data_dir):
    files = glob.glob(os.path.join(data_dir, '*.json'))
    graphs = []
    for f in files:
        with open(f, 'r', encoding='utf-8') as fh:
            try:
                graphs.append(json.load(fh))
            except Exception:
                continue
    return graphs


def json_to_pyg(graph):
    # nodes must have contiguous ids starting at 0; create mapping
    nodes = graph.get('nodes', [])
    node_ids = [n['id'] for n in nodes]
    id_map = {old: i for i, old in enumerate(node_ids)}
    N = len(node_ids)
    # compute node features: degree, time since source (minutes)
    ts_map = {}
    for n in nodes:
        ts_map[n['id']] = None
        if 'timestamp' in n and n['timestamp']:
            try:
                ts_map[n['id']] = datetime.fromisoformat(n['timestamp'])
            except Exception:
                ts_map[n['id']] = None
    source_ts = ts_map.get(0, None)
    # edges
    edges = graph.get('edges', [])
    edge_index = [[], []]
    deg = [0]*N
    for e in edges:
        s = id_map.get(e['source'])
        t = id_map.get(e['target'])
        if s is None or t is None: continue
        edge_index[0].append(s); edge_index[1].append(t)
        edge_index[0].append(t); edge_index[1].append(s)
        deg[s]+=1; deg[t]+=1

    # node features tensor: [deg, time_since_source_minutes]
    feats = []
    for old in node_ids:
        d = deg[id_map[old]]
        ts = ts_map.get(old)
        if source_ts and ts:
            dt = (ts - source_ts).total_seconds()/60.0
        else:
            dt = 0.0
        feats.append([float(d), float(dt)])

    x = torch.tensor(feats, dtype=torch.float)
    if len(edge_index[0])==0:
        edge_index_t = torch.empty((2,0), dtype=torch.long)
    else:
        edge_index_t = torch.tensor(edge_index, dtype=torch.long)

    y = torch.tensor([1 if graph.get('label')=='rumor' else 0], dtype=torch.long)
    data = Data(x=x, edge_index=edge_index_t, y=y)
    return data


class GCNNet(nn.Module):
    def __init__(self, in_channels, hidden=64, out_channels=2):
        super().__init__()
        self.conv1 = GCNConv(in_channels, hidden)
        self.conv2 = GCNConv(hidden, hidden)
        self.lin = nn.Linear(hidden, out_channels)

    def forward(self, x, edge_index, batch):
        x = self.conv1(x, edge_index)
        x = F.relu(x)
        x = self.conv2(x, edge_index)
        x = F.relu(x)
        x = global_mean_pool(x, batch)
        x = self.lin(x)
        return x


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--data-dir', default='data')
    p.add_argument('--model-out', default='models/gcn.pth')
    p.add_argument('--epochs', type=int, default=40)
    p.add_argument('--batch', type=int, default=16)
    args = p.parse_args()

    graphs = load_graphs(args.data_dir)
    if len(graphs)==0:
        print('No graphs found in', args.data_dir); return
    data_list = [json_to_pyg(g) for g in graphs]
    # simple split
    split = int(0.8 * len(data_list))
    train_list = data_list[:split]
    test_list = data_list[split:]

    train_loader = DataLoader(train_list, batch_size=args.batch, shuffle=True)
    test_loader = DataLoader(test_list, batch_size=args.batch)

    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model = GCNNet(in_channels=2).to(device)
    opt = torch.optim.Adam(model.parameters(), lr=1e-3, weight_decay=1e-4)

    for epoch in range(1, args.epochs+1):
        model.train()
        total_loss = 0.0
        for batch in train_loader:
            batch = batch.to(device)
            opt.zero_grad()
            out = model(batch.x, batch.edge_index, batch.batch)
            loss = F.cross_entropy(out, batch.y)
            loss.backward(); opt.step()
            total_loss += loss.item() * batch.num_graphs
        total_loss /= len(train_list)

        # eval
        model.eval()
        correct = 0; tot = 0
        with torch.no_grad():
            for batch in test_loader:
                batch = batch.to(device)
                out = model(batch.x, batch.edge_index, batch.batch)
                pred = out.argmax(dim=1)
                correct += (pred == batch.y).sum().item()
                tot += batch.num_graphs
        acc = correct / tot if tot>0 else 0.0
        print(f'Epoch {epoch:03d} loss={total_loss:.4f} test_acc={acc:.3f}')

    os.makedirs(os.path.dirname(args.model_out), exist_ok=True)
    torch.save({'model_state_dict': model.state_dict(), 'in_channels':2}, args.model_out)
    print('Saved GCN model to', args.model_out)


if __name__ == '__main__':
    main()
