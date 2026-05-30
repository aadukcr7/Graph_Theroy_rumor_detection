const statsGrid = document.getElementById("stats-grid");
const predictionBadge = document.getElementById("prediction-badge");
const predictionResult = document.getElementById("prediction-result");
const confidenceResult = document.getElementById("confidence-result");
const generateForm = document.getElementById("graph-form");
const generateButton = document.getElementById("generate-button");
const vertexCountInput = document.getElementById("vertex-count");
const graphLabelInput = document.getElementById("graph-label");
const zoomOutButton = document.getElementById("zoom-out");
const zoomResetButton = document.getElementById("zoom-reset");
const zoomInButton = document.getElementById("zoom-in");
const svg = d3.select("#graph-svg");

const compareSvgRumor = d3.select("#compare-rumor");
const compareSvgOrganic = d3.select("#compare-organic");
const compareRumorZoomOutButton = document.getElementById("compare-rumor-zoom-out");
const compareRumorZoomResetButton = document.getElementById("compare-rumor-zoom-reset");
const compareRumorZoomInButton = document.getElementById("compare-rumor-zoom-in");
const compareOrganicZoomOutButton = document.getElementById("compare-organic-zoom-out");
const compareOrganicZoomResetButton = document.getElementById("compare-organic-zoom-reset");
const compareOrganicZoomInButton = document.getElementById("compare-organic-zoom-in");

const tooltip = d3.select("body")
  .append("div")
  .attr("class", "tooltip");

const statLabels = [
  ["Nodes", "nodes"],
  ["Edges", "edges"],
  ["Density", "density"],
  ["Diameter", "diameter"],
  ["Radius", "radius"],
  ["Center", "center"],
  ["Temporal Weight", "avg_temporal_weight"],
];

let currentGraph = null;
let currentSimulation = null;
let mainZoomBehavior = null;

const compareData = window.COMPARE_DATA || null;

function computeTemporalWeight(delay) {
  const numericDelay = Number(delay);
  if (!Number.isFinite(numericDelay) || numericDelay <= 0) {
    return 0;
  }
  return 1 / Math.log1p(numericDelay);
}

function formatValue(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "0.00";
  }

  if (typeof value === "string") {
    return value;
  }

  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) {
    return String(value);
  }

  if (Number.isInteger(numericValue)) {
    return numericValue.toString();
  }

  return numericValue.toFixed(2);
}

function renderStats(features) {
  statsGrid.innerHTML = statLabels
    .map(([label, key]) => {
      const value = features?.[key] ?? 0;
      return `
        <div class="stat-card">
          <span>${label}</span>
          <strong>${formatValue(value)}</strong>
        </div>
      `;
    })
    .join("");
}

function renderGraph(graphData) {
  const width = 860;
  const height = 560;

  svg.selectAll("*").remove();

  if (currentSimulation) {
    currentSimulation.stop();
    currentSimulation = null;
  }

  const container = svg.append("g").attr("transform", "translate(20,20)");
  const nodes = graphData.nodes.map((node) => ({ ...node }));
  const links = graphData.links.map((link) => ({ ...link }));

  const simulation = d3
    .forceSimulation(nodes)
    .force("link", d3.forceLink(links).id((d) => d.id).distance(102))
    .force("charge", d3.forceManyBody().strength(-360))
    .force("center", d3.forceCenter((width - 40) / 2, (height - 40) / 2))
    .force("collision", d3.forceCollide().radius(30));

  mainZoomBehavior = d3
    .zoom()
    .scaleExtent([0.35, 2.8])
    .on("zoom", (event) => {
      container.attr("transform", event.transform);
    });

  svg.call(mainZoomBehavior);
  svg.call(mainZoomBehavior.transform, d3.zoomIdentity.scale(0.82).translate(18, 12));

  currentSimulation = simulation;

  const link = container
    .append("g")
    .selectAll("line")
    .data(links)
    .join("line")
    .attr("stroke", "#2f8bff")
    .attr("stroke-linecap", "round")
    .attr("stroke-opacity", 0.78)
    .attr("stroke-width", (d) => 1.2 + d.weight * 1.6)
    .on("mousemove", (event, d) => {
      const delay = Number(d.delay);
      const formulaWeight = computeTemporalWeight(delay);
      tooltip
        .style("opacity", 1)
        .style("transform", "translateY(0)")
        .style("left", `${event.pageX + 12}px`)
        .style("top", `${event.pageY - 42}px`)
        .html(
          `Delay (delta_t): ${delay.toFixed(2)}<br/>Stored weight: ${Number(d.weight).toFixed(3)}<br/>Formula: 1 / ln(1 + delta_t) = ${formulaWeight.toFixed(3)}`
        );
    })
    .on("mouseleave", () => {
      tooltip.style("opacity", 0).style("transform", "translateY(4px)");
    });

  const node = container
    .append("g")
    .selectAll("g")
    .data(nodes)
    .join("g")
    .call(d3.drag()
      .on("start", dragStarted)
      .on("drag", dragged)
      .on("end", dragEnded));

  node.append("circle")
    .attr("r", (d) => (d.id === 0 ? 21 : 16))
    .attr("fill", (d) => (d.id === 0 ? "#2f8bff" : "#0f1728"))
    .attr("stroke", (d) => (d.id === 0 ? "#8cc8ff" : "#2f8bff"))
    .attr("stroke-width", 1.6);

  node.append("text")
    .text((d) => (d.id === 0 ? "Source" : d.label))
    .attr("text-anchor", "middle")
    .attr("dy", 35)
    .attr("fill", "#cfe8ff")
    .attr("font-size", 12)
    .attr("font-weight", 700);

  simulation.on("tick", () => {
    link
      .attr("x1", (d) => d.source.x)
      .attr("y1", (d) => d.source.y)
      .attr("x2", (d) => d.target.x)
      .attr("y2", (d) => d.target.y);

    node.attr("transform", (d) => `translate(${d.x}, ${d.y})`);
  });

  function dragStarted(event) {
    if (!event.active) simulation.alphaTarget(0.25).restart();
    event.subject.fx = event.subject.x;
    event.subject.fy = event.subject.y;
  }

  function dragged(event) {
    event.subject.fx = event.x;
    event.subject.fy = event.y;
  }

  function dragEnded(event) {
    if (!event.active) simulation.alphaTarget(0);
    event.subject.fx = null;
    event.subject.fy = null;
  }
}

function renderMiniGraph(targetSvg, graphData, tint) {
  if (!targetSvg.node() || !graphData) {
    return null;
  }

  const width = 520;
  const height = 360;
  targetSvg.selectAll("*").remove();

  const container = targetSvg.append("g").attr("transform", "translate(16,16)");
  const nodes = graphData.nodes.map((node) => ({ ...node }));
  const links = graphData.links.map((link) => ({ ...link }));

  const simulation = d3
    .forceSimulation(nodes)
    .force("link", d3.forceLink(links).id((d) => d.id).distance(76))
    .force("charge", d3.forceManyBody().strength(-300))
    .force("center", d3.forceCenter((width - 32) / 2, (height - 32) / 2))
    .force("collision", d3.forceCollide().radius(22));

  const zoomBehavior = d3
    .zoom()
    .scaleExtent([0.45, 2.6])
    .on("zoom", (event) => {
      container.attr("transform", event.transform);
    });

  const initialTransform = d3.zoomIdentity.scale(0.92).translate(14, 10);
  targetSvg.call(zoomBehavior);
  targetSvg.call(zoomBehavior.transform, initialTransform);

  container.append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", width - 32)
    .attr("height", height - 32)
    .attr("rx", 16)
    .attr("fill", "transparent");

  const link = container.append("g").selectAll("line").data(links).join("line")
    .attr("stroke", tint)
    .attr("stroke-linecap", "round")
    .attr("stroke-opacity", 0.9)
    .attr("stroke-width", (d) => 1.2 + d.weight * 1.2);

  const node = container.append("g").selectAll("g").data(nodes).join("g");

  node.append("circle")
    .attr("r", (d) => (d.id === 0 ? 18 : 13))
    .attr("fill", (d) => (d.id === 0 ? tint : "#0a1529"))
    .attr("stroke", tint)
    .attr("stroke-width", 1.4);

  node.append("text")
    .text((d) => (d.id === 0 ? "Source" : d.label))
    .attr("text-anchor", "middle")
    .attr("dy", 28)
    .attr("fill", "#d9ebff")
    .attr("font-size", 11)
    .attr("font-weight", 700);

  simulation.on("tick", () => {
    link
      .attr("x1", (d) => d.source.x)
      .attr("y1", (d) => d.source.y)
      .attr("x2", (d) => d.target.x)
      .attr("y2", (d) => d.target.y);

    node.attr("transform", (d) => `translate(${d.x}, ${d.y})`);
  });

  return {
    svg: targetSvg,
    zoomBehavior,
    initialTransform,
  };
}

function bindCompareZoomControls(controller, zoomOutBtn, zoomInBtn, zoomResetBtn) {
  if (!controller || !zoomOutBtn || !zoomInBtn || !zoomResetBtn) {
    return;
  }

  zoomOutBtn.addEventListener("click", () => {
    controller.svg.transition().duration(170).call(controller.zoomBehavior.scaleBy, 0.84);
  });

  zoomInBtn.addEventListener("click", () => {
    controller.svg.transition().duration(170).call(controller.zoomBehavior.scaleBy, 1.2);
  });

  zoomResetBtn.addEventListener("click", () => {
    controller.svg.transition().duration(170).call(controller.zoomBehavior.transform, controller.initialTransform);
  });
}

function setPredictionState(label, confidence) {
  predictionResult.textContent = label;
  confidenceResult.textContent = confidence.toFixed(2);

  predictionBadge.classList.remove("neutral", "rumor", "organic");
  if (label === "rumor") {
    predictionBadge.classList.add("rumor");
    predictionBadge.textContent = "Rumor-like propagation";
  } else if (label === "organic") {
    predictionBadge.classList.add("organic");
    predictionBadge.textContent = "Organic information";
  } else {
    predictionBadge.classList.add("neutral");
    predictionBadge.textContent = "Awaiting prediction";
  }
}

async function generateGraph() {
  const response = await fetch("/generate-graph", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      vertices: Number(vertexCountInput.value),
      label: graphLabelInput.value,
    }),
  });

  if (!response.ok) {
    throw new Error("Graph generation request failed");
  }

  return response.json();
}

async function refreshGraph() {
  generateButton.disabled = true;
  generateButton.textContent = "Generating...";

  try {
    const result = await generateGraph();
    currentGraph = result.graph;
    renderGraph(currentGraph);
    renderStats(currentGraph.features);
    setPredictionState(result.prediction, result.confidence);
  } catch (error) {
    setPredictionState("--", 0.0);
    console.error(error);
  } finally {
    generateButton.disabled = false;
    generateButton.textContent = "Generate from Dataset";
  }
}

if (generateForm) {
  generateForm.addEventListener("submit", (event) => {
    event.preventDefault();
    refreshGraph();
  });
}

if (zoomOutButton) {
  zoomOutButton.addEventListener("click", () => {
    if (svg.node() && mainZoomBehavior) {
      svg.transition().duration(180).call(mainZoomBehavior.scaleBy, 0.82);
    }
  });
}

if (zoomInButton) {
  zoomInButton.addEventListener("click", () => {
    if (svg.node() && mainZoomBehavior) {
      svg.transition().duration(180).call(mainZoomBehavior.scaleBy, 1.22);
    }
  });
}

if (zoomResetButton) {
  zoomResetButton.addEventListener("click", () => {
    if (svg.node() && mainZoomBehavior) {
      svg.transition().duration(180).call(mainZoomBehavior.transform, d3.zoomIdentity.scale(0.82).translate(18, 12));
    }
  });
}

if (svg.node()) {
  refreshGraph();
}

if (compareData) {
  const rumorController = renderMiniGraph(compareSvgRumor, compareData.rumor, "#2f8bff");
  const organicController = renderMiniGraph(compareSvgOrganic, compareData.organic, "#69c7ff");

  bindCompareZoomControls(
    rumorController,
    compareRumorZoomOutButton,
    compareRumorZoomInButton,
    compareRumorZoomResetButton
  );
  bindCompareZoomControls(
    organicController,
    compareOrganicZoomOutButton,
    compareOrganicZoomInButton,
    compareOrganicZoomResetButton
  );
}
