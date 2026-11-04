import * as d3 from "d3";

export const drawNetwork = (graph) => {
    // == Section 1. Initialize Nodes and Links in DOM ==
    console.log("Drawing network...");

    // set up parameters
    const width = 1200;
    const height = 1200;
    const fallbackColor = "#A9A9A9";
    const chargeDefault = -2.5;
    const collideDefault = 3;
    const linkDefault = 2.5;
    const alphaDefault = 1;

    // extract nodes and edges from the graph data
    const graphNodes = graph.nodes;
    const graphLinks = graph.edges;

    // calculate degree of each node
    const nodeDegrees = {};

    d3.map(graphLinks, d => {
        if (nodeDegrees.hasOwnProperty(d.source)) {
            nodeDegrees[d.source] = nodeDegrees[d.source] + 1;
        } else {
            nodeDegrees[d.source] = 0;
        }

        if (nodeDegrees.hasOwnProperty(d.target)) {
            nodeDegrees[d.target] = nodeDegrees[d.target] + 1;
        } else {
            nodeDegrees[d.target] = 0;
        }
    });

    // set up circle radius scale
    const radiusScale = d3.scaleSqrt()
        .domain(d3.extent(Object.values(nodeDegrees)))
        .range([3, 12]);

    // get top ten countries
    const countryCounts = {};

    graphNodes.forEach(d => {
        if (countryCounts.hasOwnProperty(d.country)) {
            countryCounts[d.country] = countryCounts[d.country] + 1;
        } else {
            countryCounts[d.country] = 1;
        }
    });

    console.log(countryCounts);

    // sort the list of countries by count
    const sortedCountries = Object.entries(countryCounts)
        .sort(([, a], [, b]) => b - a);

    // pick out the top ten and select just the name
    const topCountries = sortedCountries.slice(0, 10).map(d => d[0]);

    console.table(topCountries);

    // create color scale, map countries in the top 10, and provide fallback color
    const colorScale = d3.scaleOrdinal()
        .domain(topCountries)
        .range(d3.schemeObservable10)
        .unknown(fallbackColor)

    // set up our svg container and group
    const svg = d3.select("#network-chart")
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)

    const g = svg.append("g")
        .attr("transform", `translate(${width/2}, ${height/2})`);

    // select all links and apply initial styling
    const links = g.selectAll(".network-link")
        .data(graphLinks)
        .join("line")
        // begin line
        .attr("class", "network-link")
        // end line

    // select all nodes and apply initial styling
    const nodes = g.selectAll(".network-node")
        .data(graphNodes)
        .join("circle")
        // begin circle
        .attr("class", "network-node")
        .attr("r", d => radiusScale(nodeDegrees[d.id]))
        .attr("fill", d => colorScale(d.country))
        // end circle

    // add interactions to nodes

    const t = d3.transition()
        .duration(100);

    // set tooltip visibility
    const tooltip = d3.select("#tooltip");
    let tooltipVisible = false;

    nodes.on("click", (e, d) => {
        tooltip.select("#name")
            .html(`<b>Name:</b> ${d.name}`);
        tooltip.select("#affiliation")
            .html(`<b>Affiliation:</b> ${d.affiliation}`);
        tooltip.select("#country")
            .html(`<b>Country:</b> ${d.country}`);
        tooltip.select("#last-publication")
            .html(`<b>Last Publication:</b> ${d.last_publication}`);

        tooltipVisible = !tooltipVisible;

        tooltip
            .style("opacity", +tooltipVisible)
            .style("left", e.pageX + 10 + "px")
            .style("top", e.pageY + "px");
    });

    nodes.on("mouseenter", (e, d) => {
        links.classed("link-selected", link => link.source.id === d.id || link.target.id === d.id);
        nodes.classed("author-hover", node => node.id === d.id);
        nodes.classed("author-hidden", node => node.affiliation !== d.affiliation);
    });

    nodes.on("mouseleave", (e, d) => {
        links.classed("link-selected", false);
        nodes.classed("author-hover", false);
        nodes.classed("author-hidden", false);

        tooltipVisible = false;
        tooltip.style("opacity", +tooltipVisible);
    });

    // == Section 2. Update Network Function ==
    const updateNetwork = () => {
        // update position of each node
        nodes
            .attr("cx", d => d.x)
            .attr("cy", d => d.y);

        // update position of each link
        links
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);
    };

    // == Section 3. Simulation Function ==

    let chargeValue = chargeDefault;
    let collideValue = collideDefault;
    let linkValue = linkDefault;

    // create force simulation
    const simulation = d3.forceSimulation()
        .force("charge", d3.forceManyBody()
            .strength(-2.5))
        .force("collide", d3.forceCollide()
            .radius(d => radiusScale(nodeDegrees[d.id]) + collideValue))
        .force("link", d3.forceLink()
            .id(d => d.id)
            .strength(2.5)
        )
        .force("x", d3.forceX()
            .strength(0.01))
        .force("y", d3.forceY()
            .strength(0.01))
        .force("bounding", () => {
            graphNodes.forEach(node => {
                if (node.x < -width/2 + node.radius) {
                    node.vx = 1;
                }
                if (node.y < -height/2 + node.radius) {
                    node.vy = 1;
                }
                if (node.x > width/2 - node.radius) {
                    node.vx = -1;
                }
                if (node.y > height/2 - node.radius) {
                    node.vy = -1;
                }
            });
        })
        .nodes(graphNodes)
        .on("tick", updateNetwork);

    // add links to simulation
    simulation
        .force("link")
        .links(graphLinks);

    // button state
    let simulationButton = "Stop";

    // select playback button
    const simulationPlayback = d3.select("#simulation-playback");

    // handle button events
    simulationPlayback
        .on("click", () => {
            switch (simulationButton) {
                case "Stop":
                    simulation.stop();
                    simulationButton = "Restart";
                    break;
                case "Restart":
                    simulation.restart();
                    simulationButton = "Stop";
                    break;
            }

            // update text label
            d3.select("#simulation-playback")
                .text(`${simulationButton} Simulation`);
        });

    // select each slider element
    const collideSlider = d3.select("#collide");
    const chargeSlider = d3.select("#charge");
    const linkSlider = d3.select("#link");

    // select each text box
    const collideText = d3.select("#collide-text");
    const chargeText = d3.select("#charge-text");
    const linkText = d3.select("#link-text");

    // handle charge slider
    chargeText.text(`${chargeValue}`);

    chargeSlider.on("input", (event) => {
        chargeValue = event.target.value;

        simulation.alpha(alphaDefault)
            .restart();

        chargeText.text(`${chargeValue}`);
    });

    // handle collide slider
    collideText.text(`${collideValue}`);

    collideSlider.on("input", (event) => {
        collideValue = event.target.value;

        simulation.alpha(alphaDefault)
            .restart();

        collideText.text(`${collideValue}`);
    });

    // handle link slider
    linkText.text(`${linkValue}`);

    linkSlider.on("input", (event) => {
        linkValue = event.target.value;

        simulation.alpha(alphaDefault)
            .restart();

        linkText.text(`${linkValue}`);
    })

    // handle zoom and pan events
    const zoomHandler = d3.zoom()
        .scaleExtent([0.5, 4])

        .on("zoom", (e) => {
            svg.attr("transform", e.transform);
        });

    d3.select(".network-container")
        .call(zoomHandler);
};