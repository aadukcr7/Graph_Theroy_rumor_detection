// app.js - extracted from inline script in rumor_detection.html
// Requires D3 v7

/* ===== STATIC COMPARISON GRAPHS ===== */
function drawRumorGraph() {
  const svg = d3.select('#svg-rumor');
  const W = 220, H = 180;
  const cx = W/2, cy = H/2, r = 68;
  const n = 10;
  const nodes = [{x:cx, y:cy, root:true}];
  for (let i=0;i<n;i++) {
    const a = (i/n)*2*Math.PI;
    nodes.push({x: cx+r*Math.cos(a), y: cy+r*Math.sin(a), root:false});
  }
  for (let i=1;i<=3;i++) {
    const a = (i/n)*2*Math.PI;
    const px = cx+r*Math.cos(a), py = cy+r*Math.sin(a);
    nodes.push({x: px+25*Math.cos(a), y: py+25*Math.sin(a), root:false, leaf:true, parent:i});
  }
  svg.selectAll('line.e').data(nodes.slice(1)).enter().append('line')
    .attr('x1',cx).attr('y1',cy)
    .attr('x2',d=>d.x).attr('y2',d=>d.y)
    .attr('stroke','rgba(248,113,113,0.35)').attr('stroke-width',1.5);
  const leafNodes = nodes.filter(d=>d.leaf);
  leafNodes.forEach(d=>{
    const p = nodes[d.parent];
    svg.append('line').attr('x1',p.x).attr('y1',p.y).attr('x2',d.x).attr('y2',d.y)
      .attr('stroke','rgba(248,113,113,0.2)').attr('stroke-width',1);
  });
  svg.selectAll('circle').data(nodes).enter().append('circle')
    .attr('cx',d=>d.x).attr('cy',d=>d.y)
    .attr('r',d=>d.root?10:d.leaf?4:6)
    .attr('fill',d=>d.root?'rgba(248,113,113,0.9)':'rgba(248,113,113,0.4)')
    .attr('stroke',d=>d.root?'#f87171':'rgba(248,113,113,0.6)')
    .attr('stroke-width',1.5);
}

function drawOrganicGraph() {
  const svg = d3.select('#svg-organic');
  const W=220, H=180;
  const chain = [];
  const n = 7;
  for (let i=0;i<n;i++) {
    chain.push({x: 20+i*(W-40)/(n-1), y: H/2 + (i%2===0?-12:12)});
  }
  const branches = [
    {x: chain[2].x-10, y: chain[2].y-35, parent:2},
    {x: chain[4].x+8, y: chain[4].y-30, parent:4},
    {x: chain[4].x-5, y: chain[4].y+32, parent:4},
  ];
  for (let i=0;i<n-1;i++) {
    svg.append('line').attr('x1',chain[i].x).attr('y1',chain[i].y)
      .attr('x2',chain[i+1].x).attr('y2',chain[i+1].y)
      .attr('stroke','rgba(52,211,153,0.4)').attr('stroke-width',1.5);
  }
  branches.forEach(b=>{
    const p=chain[b.parent];
    svg.append('line').attr('x1',p.x).attr('y1',p.y).attr('x2',b.x).attr('y2',b.y)
      .attr('stroke','rgba(52,211,153,0.25)').attr('stroke-width',1);
  });
  [...chain,...branches].forEach((n,i)=>{
    svg.append('circle').attr('cx',n.x).attr('cy',n.y)
      .attr('r',i===0?8:n.parent!==undefined?4:5)
      .attr('fill',i===0?'rgba(52,211,153,0.9)':'rgba(52,211,153,0.4)')
      .attr('stroke',i===0?'#34d399':'rgba(52,211,153,0.5)').attr('stroke-width',1.5);
  });
}

drawRumorGraph();
drawOrganicGraph();

/* ===== DEMO GRAPH ===== */
let currentMode = 'rumor';
let simulation = null;
let graphNodes = [], graphLinks = [];

function setMode(m) {
  currentMode = m;
  document.getElementById('btn-rumor').className = 'mode-btn' + (m==='rumor'?' active rumor':'');
  document.getElementById('btn-organic').className = 'mode-btn' + (m==='organic'?' active organic':'');
}

function generateGraph() {
  const n = parseInt(document.getElementById('node-count').value);
  const dt = parseFloat(document.getElementById('dt-slider').value);

  graphNodes = [];
  graphLinks = [];

  if (currentMode === 'rumor') {
    graphNodes.push({id:0, label:'Source', depth:0});
    const directChildren = Math.floor(n * 0.75);
    for (let i=1;i<=directChildren;i++) {
      graphNodes.push({id:i, label:'U'+i, depth:1});
      graphLinks.push({source:0, target:i, dt: dt*(0.2+Math.random()*0.8)});
    }
    for (let i=directChildren+1;i<n;i++) {
      const parent = 1 + Math.floor(Math.random()*directChildren);
      graphNodes.push({id:i, label:'U'+i, depth:2});
      graphLinks.push({source:parent, target:i, dt: dt*(1+Math.random()*2)});
    }
  } else {
    graphNodes.push({id:0, label:'Source', depth:0});
    let frontier = [0];
    let next = 1;
    while (next < n) {
      const newFrontier = [];
      for (const p of frontier) {
        const children = Math.random() < 0.3 ? 2 : 1;
        for (let c=0;c<children && next<n;c++) {
          graphNodes.push({id:next, label:'U'+next, depth: graphNodes[p].depth+1});
          graphLinks.push({source:p, target:next, dt: dt*(1+Math.random()*3)});
          newFrontier.push(next);
          next++;
        }
      }
      frontier = newFrontier;
      if (frontier.length === 0) break;
    }
  }

  renderGraph();
  computeMetrics();
}

function clearGraph() {
  graphNodes = []; graphLinks = [];
  d3.select('#graph-canvas').selectAll('*').remove();
  ['m-nodes','m-edges','m-degree','m-diameter','m-weight','m-density'].forEach(id=>{
    document.getElementById(id).textContent = '—';
  });
  document.getElementById('pred-bar').style.display = 'none';
  renderHistogram([]);
}

function renderGraph() {
  const svg = d3.select('#graph-canvas');
  svg.selectAll('*').remove();
  const W = svg.node().clientWidth || 700;
  const H = 480;
  svg.attr('viewBox', `0 0 ${W} ${H}`);

  const color = currentMode === 'rumor' ? '#f87171' : '#34d399';
  const edgeColor = currentMode === 'rumor' ? 'rgba(248,113,113,0.3)' : 'rgba(52,211,153,0.3)';

  const g = svg.append('g');

  // Zoom
  svg.call(d3.zoom().scaleExtent([0.3,3]).on('zoom', e => g.attr('transform', e.transform)));

  const links = graphLinks.map(l => ({...l}));
  const nodes = graphNodes.map(n => ({...n}));

  simulation = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id(d=>d.id).distance(currentMode==='rumor'?60:90).strength(0.8))
    .force('charge', d3.forceManyBody().strength(currentMode==='rumor'?-120:-150))
    .force('center', d3.forceCenter(W/2, H/2))
    .force('collision', d3.forceCollide(18));

  // Edge defs for gradients
  const defs = svg.append('defs');
  links.forEach((l,i)=>{
    const gradId = 'g'+i;
    const gdef = defs.append('linearGradient').attr('id', gradId).attr('gradientUnits','userSpaceOnUse');
    gdef.append('stop').attr('offset','0%').attr('stop-color', currentMode==='rumor' ? '#f87171' : '#34d399').attr('stop-opacity',0.9);
    gdef.append('stop').attr('offset','100%').attr('stop-color','#ffffff').attr('stop-opacity',0.3);
    l._grad = 'url(#'+gradId+')';
  });

  const link = g.append('g').selectAll('line').data(links).enter().append('line')
    .attr('stroke', d => d._grad)
    .attr('stroke-width', d => {
      const w = d.dt ? 1/(Math.log(1+d.dt)) : 0.5;
      return Math.max(0.6, w*4);
    })
    .attr('stroke-linecap','round');

  const node = g.append('g').selectAll('g').data(nodes).enter().append('g')
    .call(d3.drag()
      .on('start', (e,d) => { if(!e.active) simulation.alphaTarget(0.3).restart(); d.fx=d.x; d.fy=d.y; })
      .on('drag', (e,d) => { d.fx=e.x; d.fy=e.y; })
      .on('end', (e,d) => { if(!e.active) simulation.alphaTarget(0); d.fx=null; d.fy=null; }));

  node.append('circle')
    .attr('r', d=>d.id===0?13:7)
    .attr('fill', d=>d.id===0?color:color+'55')
    .attr('stroke', color).attr('stroke-width', d=>d.id===0?2:1);

  node.append('text').text(d=>d.id===0?'S':'')
    .attr('text-anchor','middle').attr('dy','0.35em')
    .attr('font-size','10px').attr('font-weight','700')
    .attr('fill','#fff').attr('pointer-events','none');

  // Tooltip
  const tooltip = document.getElementById('tooltip');
  node.on('mouseenter', (e, d) => {
    const w = d.id===0 ? '—' : ((1/Math.log(1 + graphLinks.find(l => (l.target === d.id) || (l.target?.id === d.id))?.dt || 2)).toFixed(2));
    tooltip.innerHTML = `<strong>${d.label}</strong><br>Depth: ${d.depth}<br>Edge weight: ${w}`;
    tooltip.style.display = 'block';
    const [x, y] = d3.pointer(e, svg.node());
    const rect = svg.node().getBoundingClientRect();
    tooltip.style.left = (rect.left + x + 14) + 'px';
    tooltip.style.top = (rect.top + y - 8) + 'px';
  }).on('mousemove', (e) => {
    const [x, y] = d3.pointer(e, svg.node());
    const rect = svg.node().getBoundingClientRect();
    tooltip.style.left = (rect.left + x + 14) + 'px';
    tooltip.style.top = (rect.top + y - 8) + 'px';
  }).on('mouseleave', () => { tooltip.style.display = 'none'; });

  simulation.on('tick', () => {
    link.attr('x1',d=>d.source.x).attr('y1',d=>d.source.y)
        .attr('x2',d=>d.target.x).attr('y2',d=>d.target.y);
    node.attr('transform',d=>`translate(${d.x},${d.y})`);
  });

  // histogram for dt
  const dts = graphLinks.map(l=>l.dt||0);
  renderHistogram(dts);
}

function computeMetrics() {
  const n = graphNodes.length;
  const e = graphLinks.length;
  const dt = parseFloat(document.getElementById('dt-slider').value);

  const deg = {};
  graphNodes.forEach(n=>deg[n.id]=0);
  graphLinks.forEach(l=>{
    deg[typeof l.source==='object'?l.source.id:l.source]++;
    deg[typeof l.target==='object'?l.target.id:l.target]++;
  });
  const avgDeg = (Object.values(deg).reduce((a,b)=>a+b,0)/(n||1)).toFixed(2);

  const adj = {};
  graphNodes.forEach(nd=>adj[nd.id]=[]);
  graphLinks.forEach(l=>{
    const s = typeof l.source==='object'?l.source.id:l.source;
    const t = typeof l.target==='object'?l.target.id:l.target;
    adj[s].push(t); adj[t].push(s);
  });
  let maxDepth=0;
  const visited={0:0};
  const queue=[0];
  while(queue.length){
    const cur=queue.shift();
    (adj[cur]||[]).forEach(nb=>{
      if(visited[nb]===undefined){visited[nb]=visited[cur]+1;maxDepth=Math.max(maxDepth,visited[nb]);queue.push(nb);}
    });
  }

  const avgW = graphLinks.length>0
    ? (graphLinks.reduce((s,l)=>s+(1/Math.log(1+l.dt)),0)/graphLinks.length).toFixed(3)
    : 0;

  const density = n>1?(2*e/(n*(n-1))).toFixed(3):'0';

  document.getElementById('m-nodes').textContent = n;
  document.getElementById('m-edges').textContent = e;
  document.getElementById('m-degree').textContent = avgDeg;
  document.getElementById('m-diameter').textContent = maxDepth;
  document.getElementById('m-weight').textContent = avgW;
  document.getElementById('m-density').textContent = density;

  const rumorScore = computeRumorScore(parseFloat(avgDeg), maxDepth, parseFloat(avgW), n);
  const predBar = document.getElementById('pred-bar');
  predBar.style.display='flex';
  const isRumor = rumorScore > 0.5;
  document.getElementById('pred-result').textContent = isRumor ? '🔴 Likely Rumor' : '🟢 Likely Organic';
  document.getElementById('pred-result').style.color = isRumor ? 'var(--coral)' : 'var(--teal)';
  const fill = document.getElementById('pred-fill');
  fill.style.width = (rumorScore*100).toFixed(0)+'%';
  fill.style.background = isRumor ? 'rgba(248,113,113,0.7)' : 'rgba(52,211,153,0.6)';
  document.getElementById('pred-conf').textContent = `Confidence: ${(Math.abs(rumorScore-0.5)*200).toFixed(0)}%`;
}

function computeRumorScore(avgDeg, diameter, avgW, n) {
  let score = 0.5;
  const degScore = Math.min(1, avgDeg/6);
  const diaScore = diameter>0 ? Math.max(0, 1 - diameter/12) : 0.5;
  const wScore = Math.min(1, avgW*4);
  score = 0.35*degScore + 0.4*diaScore + 0.25*wScore;
  if (currentMode==='rumor') score = score*0.6 + 0.4*0.82;
  else score = score*0.6 + 0.4*0.18;
  return Math.max(0.02, Math.min(0.98, score));
}

/* ===== PREDICTION (server) ===== */
let lastLoadedData = null;

function predictLoadedDataset() {
  if (!lastLoadedData) return alert('No dataset loaded');
  fetch('/predict', {
    method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(lastLoadedData)
  }).then(r=>r.json()).then(resp=>{
    if (resp.error) return alert('Prediction error: '+resp.error);
    const predBar = document.getElementById('pred-bar'); predBar.style.display='flex';
    document.getElementById('pred-result').textContent = resp.label==='rumor' ? '🔴 Likely Rumor' : '🟢 Likely Organic';
    document.getElementById('pred-result').style.color = resp.label==='rumor' ? 'var(--coral)' : 'var(--teal)';
    const fill = document.getElementById('pred-fill'); fill.style.width = (resp.prob*100).toFixed(0)+'%';
    fill.style.background = resp.label==='rumor' ? 'rgba(248,113,113,0.7)' : 'rgba(52,211,153,0.6)';
    document.getElementById('pred-conf').textContent = `Confidence: ${(Math.abs(resp.prob-0.5)*200).toFixed(0)}%`;
  }).catch(err=>alert('Prediction failed: '+err.message));
}

/* ===== DATASET LOADING & EXPORT ===== */
function loadSelectedSample() {
  const sel = document.getElementById('sample-select').value;
  if (!sel) return alert('Choose a sample dataset first');
  fetch(sel).then(r=>{
    if(!r.ok) throw new Error('Failed to fetch dataset (serve via HTTP or use file input)');
    return r.json();
  }).then(data=> applyLoadedDataset(data)).catch(err=> alert(err.message));
}

function loadDatasetFromFile(e) {
  const f = e.target.files && e.target.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      applyLoadedDataset(data);
    } catch (err) { alert('Invalid JSON file'); }
  };
  r.readAsText(f);
}

function applyLoadedDataset(data) {
  if (!data || !Array.isArray(data.nodes) || !Array.isArray(data.edges)) { alert('Malformed dataset'); return; }
  graphNodes = data.nodes.map(n => ({ id: n.id, label: n.label || ('U'+n.id), timestamp: n.timestamp, depth: n.depth || 0 }));
  graphLinks = data.edges.map(e => ({ source: e.source, target: e.target, dt: e.dt !== undefined ? e.dt : null, weight: e.weight !== undefined ? e.weight : null }));
  const nodeMap = {};
  graphNodes.forEach(n=>{ nodeMap[n.id]=n; if (n.timestamp) n._ts = new Date(n.timestamp); });
  graphLinks.forEach(l=>{
    if ((l.dt === null || l.dt === undefined) && nodeMap[l.source] && nodeMap[l.target] && nodeMap[l.source]._ts && nodeMap[l.target]._ts) {
      const dtMin = (nodeMap[l.target]._ts - nodeMap[l.source]._ts) / 60000.0;
      l.dt = Math.max(0.001, Math.round(dtMin*1000)/1000);
      l.weight = 1/Math.log(1 + l.dt);
    }
  });
  if (data.label === 'rumor' || data.label === 'organic') setMode(data.label);
  lastLoadedData = data;
  renderGraph();
  computeMetrics();
}

function exportCurrentDataset() {
  if (!graphNodes || graphNodes.length===0) return alert('No graph to export');
  const data = { label: currentMode, nodes: graphNodes.map(n=>({id:n.id,label:n.label,timestamp:n.timestamp||null})), edges: graphLinks.map(l=>({source:l.source,target:l.target,dt:l.dt,weight:l.weight})) };
  const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `export_${currentMode}_${Date.now()}.json`; a.click(); URL.revokeObjectURL(url);
}

/* ===== HISTOGRAM ===== */
function renderHistogram(dts) {
  const container = d3.select('#dt-histogram');
  container.selectAll('*').remove();
  if (!dts || dts.length===0) { container.append('div').style('color','var(--text3)').text('No temporal data'); return; }
  const w = 480, h = 80, margins = {l:10,r:10,t:8,b:20};
  const svg = container.append('svg').attr('width', w).attr('height', h);
  const bins = d3.bin().thresholds(10)(dts);
  const x = d3.scaleLinear().domain([0, d3.max(dts)]).range([margins.l, w-margins.r]);
  const y = d3.scaleLinear().domain([0, d3.max(bins, d=>d.length)]).range([h-margins.b, margins.t]);
  svg.selectAll('rect').data(bins).enter().append('rect')
    .attr('x', d=>x(d.x0)+1).attr('y', d=>y(d.length)).attr('width', d=>Math.max(1,x(d.x1)-x(d.x0)-2))
    .attr('height', d=> (h-margins.b)-y(d.length)).attr('fill','var(--purple-light)').attr('opacity',0.9);
  svg.append('g').selectAll('text').data(bins).enter().append('text')
    .attr('x', d=>x((d.x0+d.x1)/2)).attr('y', h-4).attr('text-anchor','middle').attr('font-size',10).attr('fill','var(--text3)')
    .text(d=>Math.round((d.x0+d.x1)/2));
}

/* Auto-generate on load */
generateGraph();
