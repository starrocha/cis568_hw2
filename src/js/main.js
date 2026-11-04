import graph from "../data/publication_network.json";
import {drawNetwork} from "./network";

console.log("Loading data...");
console.log(graph);

drawNetwork(graph);
