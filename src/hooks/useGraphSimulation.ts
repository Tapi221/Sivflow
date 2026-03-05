import { useEffect, useRef, useState } from "react";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type Simulation,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
  type ForceLink,
} from "d3-force";

export interface GraphNode extends SimulationNodeDatum {
  id: string;
  type: "card" | "symbol";
  // Add other properties as needed
}

export interface GraphLink extends SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
  id?: string;
  lineType?: "straight" | "wave" | "zigzag" | "double";
}

interface UseGraphSimulationProps {
  nodes: GraphNode[];
  links: GraphLink[];
  width: number;
  height: number;
  centerForceStrength?: number;
  chargeStrength?: number;
  linkDistance?: number;
}

export function useGraphSimulation({
  nodes,
  links,
  width,
  height,
  centerForceStrength = 1,
  chargeStrength = -300,
  linkDistance = 50,
}: UseGraphSimulationProps) {
  const simulation = useRef<Simulation<GraphNode, GraphLink>>(null);
  const [currentNodes, setCurrentNodes] = useState<GraphNode[]>(nodes);
  const [currentLinks, setCurrentLinks] = useState<GraphLink[]>(links);

  useEffect(() => {
    // Initialize simulation
    const sim = forceSimulation<GraphNode, GraphLink>(nodes)
      .force(
        "link",
        forceLink<GraphNode, GraphLink>(links)
          .id((d) => d.id)
          .distance(linkDistance),
      )
      .force("charge", forceManyBody().strength(chargeStrength))
      .force(
        "center",
        forceCenter(width / 2, height / 2).strength(centerForceStrength),
      )
      .force("collide", forceCollide().radius(50)) // Prevent overlap, based on card size
      .on("tick", () => {
        // Update state to trigger re-render on tick
        // Optimization: Maybe don't set state on every tick if performance is an issue
        // Instead, update a ref or use a mutable store, or use requestAnimationFrame
        // For React state, throttling might be needed.
        // For now, simple state update (works fine for small graphs)
        setCurrentNodes([...nodes]);
        setCurrentLinks([...links]);
      });

    simulation.current = sim;

    return () => {
      sim.stop();
    };
  }, []); // Run once on mount? Or when nodes/links change?

  // Handle updates to nodes/links efficiently
  useEffect(() => {
    if (!simulation.current) return;

    const sim = simulation.current;

    // Update nodes
    sim.nodes(nodes);

    // Update links
    // Update links
    const linkForce = sim.force("link") as ForceLink<GraphNode, GraphLink>;
    if (linkForce) {
      linkForce.links(links).distance(linkDistance);
    }

    sim.alpha(1).restart();
  }, [
    nodes,
    links,
    width,
    height,
    chargeStrength,
    centerForceStrength,
    linkDistance,
  ]);

  const restart = () => {
    if (simulation.current) {
      simulation.current.alpha(1).restart();
    }
  };
  const getSimulation = () => simulation.current;

  return {
    nodes: currentNodes,
    links: currentLinks,
    getSimulation,
    restart,
  };
}
