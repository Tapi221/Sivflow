import React, { useMemo } from 'react';
import { useGraphSimulation, type GraphNode, type GraphLink } from '../../hooks/useGraphSimulation';
import { useCardRelations } from '../../hooks/useCardRelations';
import { useCards } from '../../hooks/useCards';
import { useTags } from '../../hooks/useTags';
import type { Card } from '../../types';

interface LocalMapProps {
  centerCardId: string;
  width?: number;
  height?: number;
  onNodeClick?: (cardId: string) => void;
}

export const LocalMap: React.FC<LocalMapProps> = ({ 
  centerCardId, 
  width = 300, 
  height = 300,
  onNodeClick 
}) => {
  // 1. Data Fetching
  const { relations } = useCardRelations(centerCardId);
  const { cards } = useCards(); 
  const { getTagColor } = useTags();

  // 2. Prepare Graph Data with Directional Layout
  const graphData = useMemo(() => {
    if (!relations || !cards) return { nodes: [], links: [] };

    const nodes: GraphNode[] = [];
    const centerX = width / 2;
    const centerY = height / 2;

    // Center Node (Fixed)
    nodes.push({ id: centerCardId, type: 'card', x: centerX, y: centerY, fx: centerX, fy: centerY });

    // Identify related nodes and position them
    // Direction rules: 
    // Prerequisite (from -> center) : UP (y < centerY) or LEFT (x < centerX)
    // Derivation (center -> to) : DOWN (y > centerY) or RIGHT (x > centerX)
    // We'll use Up/Down for now as it's cleaner for hierarchies.
    
    relations.forEach(r => {
        let relatedId: string | null = null;
        let position: 'up' | 'down' | 'neutral' = 'neutral';

        if (r.toCardId === centerCardId) {
            // "from" is Prerequisite -> Up
            relatedId = r.fromCardId;
            position = 'up';
        } else if (r.fromCardId === centerCardId) {
            // "to" is Derivation -> Down
            relatedId = r.toCardId;
            position = 'down';
        }

        if (relatedId) {
            // Spread x slightly to avoid overlap if multiple
            const offsetX = (Math.random() - 0.5) * (width * 0.5);
            const targetY = position === 'up' ? centerY - height * 0.3 : centerY + height * 0.3;
            
            // Only add if not already added (though relations should be unique per pair usually)
            if (!nodes.find(n => n.id === relatedId)) {
                nodes.push({
                    id: relatedId,
                    type: 'card',
                    x: centerX + offsetX,
                    y: targetY,
                    // Use force to pull them? Or fix them?
                    // Let's rely on force but give initial position.
                    // To enforce "Depth", we could use 'fy' (fixed y) or let them float around Y.
                    // Spec says "Direction implies depth". Let's try fixing Y for strong visual structure?
                    // Or standard force with Y-bias.
                    // For "Local Map", fixed structure is often easier to read.
                });
            }
        }
    });

    const links: GraphLink[] = relations.map(r => ({
        source: r.fromCardId,
        target: r.toCardId,
        lineType: r.lineType || 'straight'
    }));

    return { nodes, links };
  }, [centerCardId, relations, cards, width, height]);

  // 3. Simulation
  const { nodes, links } = useGraphSimulation({
    nodes: graphData.nodes,
    links: graphData.links,
    width,
    height,
    chargeStrength: -300, // Stronger repulsion
    linkDistance: 60,     // Optimized distance
    centerForceStrength: 0.08 
  });

  const { createRelation } = useCardRelations(centerCardId);

  // Helper to get card title
  const getCardTitle = (id: string) => {
      const card = cards.find(c => c.id === id);
      return card?.questionText || 'Unknown';
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      // Only allow if dragging a card
      e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = async (e: React.DragEvent) => {
      e.preventDefault();
      const droppedCardId = e.dataTransfer.getData('text/plain');
      
      if (!droppedCardId || droppedCardId === centerCardId) return;

      // Check if relation already exists?
      const exists = relations.some(r => 
          (r.fromCardId === centerCardId && r.toCardId === droppedCardId) ||
          (r.fromCardId === droppedCardId && r.toCardId === centerCardId)
      );

      if (exists) {
          console.log('Relation already exists');
          return;
      }

      try {
          // Calculate drop position relative to SVG?
          // For now, just create relation. 
          // Future: use drop position to set initial pos in simulation (harder with d3 force unless we fix it)
          // But "LocalMap" is auto-layout around center.
          
          await createRelation({
              fromCardId: centerCardId,
              toCardId: droppedCardId,
              type: 'related',
              lineType: 'straight'
          });
          console.log('Created relation:', centerCardId, '->', droppedCardId);
      } catch (err) {
          console.error('Failed to create relation:', err);
      }
  };

  const handleNodeDragStart = (e: React.DragEvent, nodeId: string) => {
      e.stopPropagation();
      e.dataTransfer.setData('text/plain', nodeId);
      e.dataTransfer.setData('application/x-flashcard-node', nodeId); // Marker for node drag
      e.dataTransfer.effectAllowed = 'copyMove';
  };

  return (
    <div 
        className="local-map-container" 
        style={{ width, height, background: 'var(--background-secondary)', borderRadius: '8px', overflow: 'hidden' }}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
    >
      <svg width={width} height={height}>
        <g className="links">
          {links.map((link, i) => {
             const source = link.source as GraphNode; // d3 modifies these to objects
             const target = link.target as GraphNode;
             return (
               <line
                 key={i}
                 x1={source.x}
                 y1={source.y}
                 x2={target.x}
                 y2={target.y}
                 stroke="var(--foreground-muted)"
                 strokeWidth={2}
                 opacity={0.6}
               />
             );
          })}
        </g>
        <g className="nodes">
          {nodes.map((node) => {
             const card = cards?.find(c => c.id === node.id);
             const tagColor = card?.tags && card.tags.length > 0 
                ? getTagColor(typeof card.tags[0] === 'string' ? card.tags[0] : card.tags[0].name)
                : 'var(--card-bg)';
             
             // Check if isolated (no links connected to this node) inside the VISIBLE graph
             // Note: 'links' here comes from simulation which might have fewer links if filtered, 
             // but graphData.links is the source of truth for this Local Map scope.
             const isIsolated = !graphData.links.some(l => l.source === node.id || l.target === node.id) && node.id !== centerCardId;

             return (
            <g 
                key={node.id} 
                transform={`translate(${node.x},${node.y})`}
                onClick={() => onNodeClick && onNodeClick(node.id)}
                style={{ cursor: node.id === centerCardId ? 'default' : 'grab' }}
                {...({ draggable: node.id !== centerCardId } as any)}
                onDragStart={(e) => node.id !== centerCardId && handleNodeDragStart(e, node.id)}
                className={isIsolated ? "animate-pulse" : ""}
            >
              <circle
                r={node.id === centerCardId ? 25 : 15}
                fill={node.id === centerCardId ? 'var(--primary)' : tagColor}
                stroke={isIsolated ? "#ef4444" : "var(--border)"}
                strokeWidth={isIsolated ? 2 : 2}
                strokeDasharray={isIsolated ? "4 2" : "none"}
                className="transition-colors duration-300"
              />
              <text
                dy={node.id === centerCardId ? 35 : 25}
                textAnchor="middle"
                fontSize={10}
                fill="var(--foreground)"
                style={{ pointerEvents: 'none' }}
              >
                {getCardTitle(node.id).slice(0, 10)}
              </text>
            </g>
          )})}
        </g>
      </svg>
    </div>
  );
};
