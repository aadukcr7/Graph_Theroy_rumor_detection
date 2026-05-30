const sampleGraph = {
  nodes: [
    { id: 0, label: "Source" },
    { id: 1, label: "Share A" },
    { id: 2, label: "Share B" },
    { id: 3, label: "Share C" },
    { id: 4, label: "Share D" },
    { id: 5, label: "Share E" },
    { id: 6, label: "Share F" },
  ],
  links: [
    { source: 0, target: 1, delay: 0.9, weight: 1.52 },
    { source: 0, target: 2, delay: 1.2, weight: 1.24 },
    { source: 0, target: 3, delay: 1.5, weight: 1.09 },
    { source: 1, target: 4, delay: 1.1, weight: 1.30 },
    { source: 1, target: 5, delay: 0.8, weight: 1.64 },
    { source: 2, target: 6, delay: 1.7, weight: 0.99 },
  ],
  metrics: {
    nodes: 7,
    edges: 6,
    density: 0.29,
    diameter: 3,
    clustering: 0.18,
    centralization: 0.73,
    temporalWeight: 1.30,
    diffusionSpeed: 0.93,
  },
};

const featureColumns = window.PROJECT_FEATURES || [];
const featureDefaults = window.PROJECT_DEFAULTS || {};
const statsGrid = document.getElementById("stats-grid");
const predictionBadge = document.getElementById("prediction-badge");
const predictionResult = document.getElementById("prediction-result");
const confidenceResult = document.getElementById("confidence-result");
const predictButton = document.getElementById("predict-button");
const predictionForm = document.getElementById("prediction-form");
const svg = d3.select("#graph-svg");

const tooltip = d3.select("body")
  .append("div")
  .attr("class", "tooltip");

const statCards = [
  ["Nodes", sampleGraph.metrics.nodes],
  ["Edges", sampleGraph.metrics.edges],
  ["Density", sampleGraph.metrics.density],
  ["Diameter", sampleGraph.metrics.diameter],
  ["Clustering Coefficient", sampleGraph.metrics.clustering],
  ["Centralization", sampleGraph.metrics.centralization],
  ["Temporal Weight", sampleGraph.metrics.temporalWeight],
  ["Diffusion Speed", sampleGraph.metrics.diffusionSpeed],
];

function formatValue(value) {
  return Number.isInteger(value) ? value.toString() : value.toFixed(2);
}

function renderStats() {
  statsGrid.innerHTML = statCards
    .map(
      ([label, value]) => `
        <div class="stat-card">
          <span>${label}</span>
          <strong>${formatValue(value)}</strong>
        </div>
      `
    )
    .join("");
}

function renderGraph() {
  const width = 760;
  const height = 520;

  svg.selectAll("*").remove();

  const container = svg.append("g").attr("transform", "translate(20,20)");
  const simulation = d3
    .forceSimulation(sampleGraph.nodes)
    .force("link", d3.forceLink(sampleGraph.links).id((d) => d.id).distance(98))
    .force("charge", d3.forceManyBody().strength(-320))
    .force("center", d3.forceCenter((width - 40) / 2, (height - 40) / 2))
    .force("collision", d3.forceCollide().radius(28));

  const link = container
    .append("g")
    .selectAll("line")
    .data(sampleGraph.links)
    .join("line")
    .attr("stroke", "#0f5f73")
    .attr("stroke-linecap", "round")
    .attr("stroke-opacity", 0.8)
    .attr("stroke-width", (d) => 1.5 + d.weight * 1.5)
    .on("mousemove", (event, d) => {
      tooltip
        .style("opacity", 1)
        .style("transform", "translateY(0)")
        .style("left", `${event.pageX + 12}px`)
        .style("top", `${event.pageY - 36}px`)
        .html(`Delay: ${d.delay.toFixed(2)}<br/>Weight: ${d.weight.toFixed(2)}`);
    })
    .on("mouseleave", () => {
      tooltip.style("opacity", 0).style("transform", "translateY(4px)");
    });

  const node = container
    .append("g")
    .selectAll("g")
    .data(sampleGraph.nodes)
    .join("g")
    .call(d3.drag()
      .on("start", dragStarted)
      .on("drag", dragged)
      .on("end", dragEnded));

  node.append("circle")
    .attr("r", (d) => (d.id === 0 ? 21 : 16))
    .attr("fill", (d) => (d.id === 0 ? "#8b2f1f" : "#f1d9bd"))
    .attr("stroke", "#17202a")
    .attr("stroke-width", 1.2);

  node.append("text")
    .text((d) => (d.id === 0 ? "Source" : d.label))
    .attr("text-anchor", "middle")
    .attr("dy", 35)
    .attr("fill", "#17202a")
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

async function predictFromForm() {
  const formData = new FormData(predictionForm);
  const payload = {};

  for (const key of featureColumns) {
    if (formData.has(key)) {
      payload[key] = Number(formData.get(key));
    }
  }

  const response = await fetch("/predict", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Prediction request failed");
  }

  return response.json();
}

predictButton.addEventListener("click", async () => {
  predictButton.disabled = true;
  predictButton.textContent = "Predicting...";

  try {
    const result = await predictFromForm();
    setPredictionState(result.prediction, result.confidence);
  } catch (error) {
    setPredictionState("organic", 0.0);
    console.error(error);
  } finally {
    predictButton.disabled = false;
    predictButton.textContent = "Predict Rumor Risk";
  }
});

renderStats();
renderGraph();
setPredictionState("organic", 0.0);
