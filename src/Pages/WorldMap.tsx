import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAllDescendantCards } from '../hooks/useAllDescendantCards';
import { useProjectMap } from '../hooks/useProjectMap';
import { useGraphSimulation, type GraphNode, type GraphLink } from '../hooks/useGraphSimulation';
import { useCardRelations } from '../hooks/useCardRelations';
import { Button } from '../Components/ui/button';
import { HandTray } from '../Components/map/HandTray';
import { CardPopup } from '../Components/card/CardPopup';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../Components/ui/dropdown-menu';
import { ArrowLeft, Save, Settings } from 'lucide-react';

import { select } from 'd3-selection';
import { zoom, type ZoomBehavior } from 'd3-zoom';
import { useTags } from '../hooks/useTags';
import { useMapTutorial } from '../hooks/useMapTutorial';
import { MapTutorialOverlay } from '../Components/map/MapTutorialOverlay';


export default function WorldMap() {
  const navigate = useNavigate();
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);
  const folderId = urlParams.get('folderId') || '';
  const mapId = urlParams.get('mapId');
  
  // Hooks
  const { cards, loading: cardsLoading } = useAllDescendantCards(folderId || undefined);
  const { maps, createMap, updateMap } = useProjectMap(folderId);
  const { relations, createRelation } = useCardRelations();
  const { getTagColor } = useTags();
  
  // Tutorial Hook
  const tutorial = useMapTutorial();
  
  const projectMap = useMemo(() => {
      if (mapId) return maps.find(m => m.id === mapId);
      return maps[0];
  }, [maps, mapId]); 

  // State
  const [defaultLineType, setDefaultLineType] = useState<'straight' | 'wave' | 'zigzag' | 'double'>('straight');
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const [isReturnMode, setIsReturnMode] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  
  const svgRef = useRef<SVGSVGElement>(null);

  // --- Graph Data Prep ---
  const graphData = useMemo(() => {
    if (!cards || !projectMap) return { nodes: [], links: [] };

    const validNodeIds = new Set<string>();
    const validNodes: GraphNode[] = [];
    
    projectMap.nodes.forEach(n => {
        const card = cards.find(c => c.id === n.cardId);
        if (card) {
            validNodeIds.add(n.cardId);
            validNodes.push({
                id: n.cardId,
                type: 'card',
                x: n.x,
                y: n.y,
                fx: n.pinned ? n.x : undefined,
                fy: n.pinned ? n.y : undefined
            });
        }
    });

    // Create links from relations where both nodes exist in the map
    const links: GraphLink[] = (relations || [])
        .filter(r => validNodeIds.has(r.fromCardId) && validNodeIds.has(r.toCardId))
        .map(r => ({
            source: r.fromCardId,
            target: r.toCardId,
            id: r.id,
            lineType: r.lineType || 'straight'
        }));
    
    return { nodes: validNodes, links };
  }, [cards, projectMap, relations]);

  // --- Simulation ---
  const { nodes, links, restart } = useGraphSimulation({
      nodes: graphData.nodes,
      links: graphData.links,
      width: window.innerWidth,
      height: window.innerHeight,
      chargeStrength: -300
  });

  useEffect(() => {
    if (nodes.length > 0) restart();
  }, [graphData.nodes.length, graphData.links.length]);

  // --- Zoom/Pan Setup ---
  useEffect(() => {
      if (!svgRef.current) return;

      const zoomBehavior: ZoomBehavior<SVGSVGElement, unknown> = zoom<SVGSVGElement, unknown>()
          .scaleExtent([0.1, 4])
          .on('zoom', (event) => {
              setTransform(event.transform);
          });

      select(svgRef.current).call(zoomBehavior);
  }, []);

  // Get list of placed card IDs for HandTray
  const placedCardIds = useMemo(() => {
      return projectMap?.nodes.map(n => n.cardId) || [];
  }, [projectMap]);

  // Handlers
  const handleSave = async () => {
      if (!projectMap) {
         await createMap({
             folderId,
             name: 'New Map',
             nodes: nodes.map(n => ({
                 cardId: n.id,
                 x: n.x,
                 y: n.y,
                 pinned: !!n.fx
             }))
         });
      } else {
          await updateMap(projectMap.id, {
             nodes: nodes.map(n => ({
                 cardId: n.id,
                 x: n.x,
                 y: n.y,
                 pinned: true 
             }))
          });
      }
      alert('Map saved!');
  };

    const returnCardToTray = async (cardId: string) => {
            if (!projectMap) return;
            // Remove node from map so it becomes available in HandTray (which derives from allCards - placedCardIds)
            const newNodes = projectMap.nodes.filter(n => n.cardId !== cardId);
            await updateMap(projectMap.id, { nodes: newNodes });
    };

  const handleCardDrop = async (cardId: string, dropX?: number, dropY?: number) => {
      // 1. Calculate World Coordinates
      const worldX = dropX !== undefined 
          ? (dropX - transform.x) / transform.k
          : (window.innerWidth / 2 - transform.x) / transform.k;
      const worldY = dropY !== undefined
          ? (dropY - transform.y) / transform.k
          : (window.innerHeight / 2 - transform.y) / transform.k;
      
      const newNode = {
          cardId,
          x: worldX,
          y: worldY,
          pinned: true // Set to true to respect drop position
      };
      
      if (!projectMap) {
          // Initialize map if it doesn't exist
          await createMap({
              folderId,
              name: 'フォルダマップ',
              nodes: [newNode]
          });
      } else {
          // Add or Update Position
          const existingNodeIndex = projectMap.nodes.findIndex(n => n.cardId === cardId);
          let newNodes;
          
          if (existingNodeIndex !== -1) {
              // Edit existing node position
              newNodes = [...projectMap.nodes];
              newNodes[existingNodeIndex] = { 
                  ...newNodes[existingNodeIndex], 
                  x: worldX, 
                  y: worldY,
                  pinned: true
              };
          } else {
              // Add new node
              newNodes = [...projectMap.nodes, newNode];
          }
          await updateMap(projectMap.id, { nodes: newNodes });
      }
  };

  const handleReturnToTray = async (cardId: string, source?: string) => {
      // kept for backward-compat API: delegate to centralized returnCardToTray
      // source is available when dropped (e.g. 'map' or 'tray'), but returnCardToTray
      // encapsulates the logic to remove from the map so the HandTray will show it again.
      await returnCardToTray(cardId);
  };
  
  const handleNodeClick = async (cardId: string) => {
      if (isReturnMode) {
          await returnCardToTray(cardId);
      } else {
          setSelectedCardId(cardId);
      }
  };

  const handleNodeDragStart = (e: React.DragEvent, cardId: string) => {
      const payload = JSON.stringify({ cardId, source: 'map' });
      e.dataTransfer.setData('text/plain', cardId);
      e.dataTransfer.setData('application/x-flashcard-node', payload);
      e.dataTransfer.setData('application/json', JSON.stringify({ type: 'node_connection', cardId }));
  };

  const handleNodeDrop = async (e: React.DragEvent, targetCardId: string) => {
      e.stopPropagation();
      e.preventDefault();
      
      const sourceCardId = e.dataTransfer.getData('text/plain');
      if (!sourceCardId || sourceCardId === targetCardId) return;

      const isSourceInMap = projectMap?.nodes.some(n => n.cardId === sourceCardId);
      
      if (isSourceInMap) {
          // Connect existing
          await createRelation({
              fromCardId: sourceCardId,
              toCardId: targetCardId,
              type: 'related',
              lineType: defaultLineType
          });
      } else {
          // Add & Connect
          await handleCardDrop(sourceCardId);
          // Wait for map update? (might be race condition if rely on projectMap state immediately)
          // Actually handleCardDrop updates DB, but 'projectMap' state comes from 'useProjectMap' subscription.
          // It might take a moment. 
          // However, createRelation is independent of Map Nodes logic. It just creates a relation in DB.
          // Links will appear once Relations are fetched and Map Nodes are fetched.
          // So it's safe to call createRelation immediately.
          await createRelation({
              fromCardId: sourceCardId,
              toCardId: targetCardId,
              type: 'related',
              lineType: defaultLineType
          });
      }
  };

  const getLinePath = (source: GraphNode, target: GraphNode, type?: string) => {
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const lType = type || 'straight';
      
      switch (lType) {
          case 'straight':
              return `M${source.x},${source.y} L${target.x},${target.y}`;
          case 'wave':
              return `M${source.x},${source.y} Q${source.x + dx / 4},${source.y + dy / 4 + 20} ${source.x + dx / 2},${source.y + dy / 2} T${target.x},${target.y}`;
          case 'zigzag':
              return `M${source.x},${source.y} L${source.x + dx/2},${source.y} L${target.x},${target.y}`;
          case 'double':
              return `M${source.x},${source.y} L${target.x},${target.y}`;
          default:
              return `M${source.x},${source.y} L${target.x},${target.y}`;
      }
  };

  if (cardsLoading) return (
        <div className="flex items-center justify-center h-screen bg-slate-50">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
  );

  return (
    <div className="w-full h-screen bg-[#F5F7F8] overflow-hidden flex flex-col relative">
        {/* Header Overlay */}
        <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start z-10 pointer-events-none">
            <div className="pointer-events-auto flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => navigate(-1)} className="bg-white shadow">
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon" className="bg-white shadow">
                            <Settings className="w-4 h-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => setDefaultLineType('straight')}>Straight {defaultLineType === 'straight' && '✓'}</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDefaultLineType('wave')}>Wave {defaultLineType === 'wave' && '✓'}</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDefaultLineType('zigzag')}>Zigzag {defaultLineType === 'zigzag' && '✓'}</DropdownMenuItem>
                         <DropdownMenuItem onClick={() => setDefaultLineType('double')}>Double {defaultLineType === 'double' && '✓'}</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            
            <div className="pointer-events-auto flex gap-2">
                 <Button 
                    onClick={() => setIsReturnMode(!isReturnMode)} 
                    variant={isReturnMode ? "destructive" : "outline"}
                    className={`shadow transition-all ${isReturnMode ? 'ring-2 ring-red-200' : 'bg-white'}`}
                 >
                    {isReturnMode ? '完了' : 'カードを戻す'}
                 </Button>
                 
                 <Button onClick={handleSave} className="bg-primary-600 text-white shadow">
                    <Save className="w-4 h-4 mr-2" />
                    Save
                 </Button>
            </div>
        </div>

        {/* Popup Overlay */}
        {selectedCardId && (
            <CardPopup
                card={cards?.find(c => c.id === selectedCardId)}
                onClose={() => setSelectedCardId(null)}
            />
        )}

        {/* Canvas Area */}
        <div 
            className="flex-1 w-full h-full relative"
            onDragOver={(e) => {
                // Always prevent default to allow drop
                e.preventDefault();
                try { e.dataTransfer.dropEffect = 'copy'; } catch (err) { }
            }}
            onDrop={(e) => {
                // Always prevent default per requirements
                e.preventDefault();
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const raw = e.dataTransfer.getData('application/x-flashcard-node') || e.dataTransfer.getData('text/plain');
                if (!raw) return;
                try {
                    const parsed = raw && raw.startsWith('{') ? JSON.parse(raw) : null;
                    let droppedCardId: string;
                    let source: string | undefined;
                    if (parsed && (parsed.cardId || parsed.id)) {
                        ({ cardId: droppedCardId, source } = parsed as any);
                        droppedCardId = droppedCardId || (parsed as any).id;
                    } else {
                        droppedCardId = raw;
                    }

                    if (source === 'map') {
                        // re-positioning on map (dragging existing node onto canvas)
                        handleCardDrop(droppedCardId, x, y);
                    } else {
                        // from tray -> add to map
                        handleCardDrop(droppedCardId, x, y);
                    }
                } catch (err) {
                    // fallback: raw may be plain id string
                    const cardId = raw;
                    if (cardId) handleCardDrop(cardId, x, y);
                }
            }}
        >
            <svg ref={svgRef} className="w-full h-full">
                <g transform={`translate(${transform.x},${transform.y}) scale(${transform.k})`}>
                    <g>
                        {links.map((link, i) => {
                             const source = link.source as GraphNode;
                             const target = link.target as GraphNode;
                             return (
                                <g key={i}>
                                    <path 
                                        d={getLinePath(source, target, link.lineType)}
                                        fill="none"
                                        stroke="#cbd5e1"
                                        strokeWidth={link.lineType === 'double' ? 4 : 2}
                                        opacity={0.8}
                                    />
                                    {link.lineType === 'double' && (
                                         <path 
                                            d={getLinePath(source, target, 'straight')}
                                            fill="none"
                                            stroke="#F5F7F8"
                                            strokeWidth={1.5}
                                         />
                                    )}
                                </g>
                             );
                        })}
                    </g>
                    <g>
                        {nodes.map(node => {
                            const card = cards?.find(c => c.id === node.id);
                            const tagColor = card?.tags && card.tags.length > 0
                                ? getTagColor(typeof card.tags[0] === 'string' ? card.tags[0] : card.tags[0].name)
                                : '#ffffff';
                            
                            return (
                                <g 
                                    key={node.id} 
                                    transform={`translate(${node.x},${node.y})`} 
                                    style={{ cursor: isReturnMode ? 'pointer' : 'grab' }}
                                    onClick={(e) => { e.stopPropagation(); handleNodeClick(node.id); }}
                                    onDrop={(e) => handleNodeDrop(e, node.id)}
                                    {...({ draggable: true } as any)}
                                    onDragStart={(e) => handleNodeDragStart(e, node.id)}
                                >
                                     {isReturnMode && (
                                         <circle r={24} fill="none" stroke="#ef4444" strokeWidth={2} strokeDasharray="4 2" className="animate-spin-slow" />
                                     )}
                                     <circle 
                                        r={20} 
                                        fill={tagColor} 
                                        stroke={isReturnMode ? "#ef4444" : "#94a3b8"} 
                                        strokeWidth={2} 
                                        className="transition-all hover:stroke-primary-500 hover:stroke-[3px]"
                                     />
                                     {isReturnMode && (
                                         <text textAnchor="middle" dy={5} fontSize={16} fill="white" fontWeight="bold">×</text>
                                     )}
                                     {!isReturnMode && (
                                         <text dy={30} textAnchor="middle" fontSize={10} fill="#475569" fontWeight="500" style={{ textShadow: '0 1px 2px rgba(255,255,255,0.8)' }}>
                                             {card?.questionText.slice(0, 10)}
                                         </text>
                                     )}
                                </g>
                            );
                        })}
                    </g>
                </g>
            </svg>
            
            {/* HandTray Overlay */}
            <div className={`absolute bottom-0 left-0 w-full z-20 p-4 pointer-events-none transition-transform duration-300 ${isReturnMode ? 'translate-y-full' : ''}`}>
                 <div className="pointer-events-auto max-w-4xl mx-auto bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
                    <HandTray 
                        folderId={folderId}
                        placedCardIds={placedCardIds}
                        allCards={cards as any}
                        onCardDrop={handleReturnToTray}
                    />
                 </div>
            </div>
            
             {/* Return Mode Overlay Hint */}
             {isReturnMode && (
                <div className="absolute bottom-8 left-0 w-full flex justify-center pointer-events-none">
                    <div className="bg-red-600 text-white px-6 py-3 rounded-full shadow-lg font-bold animate-bounce">
                        カードをタップしてトレイに戻す
                    </div>
                </div>
            )}
            
            {/* Tutorial Overlay */}
            {tutorial.isActive && (
                <MapTutorialOverlay
                    step={tutorial.currentStep}
                    currentPixelIndex={tutorial.currentStep.id - 1} 
                    totalSteps={tutorial.totalSteps}
                    onNext={tutorial.nextStep}
                    onPrev={tutorial.prevStep}
                    onSkip={tutorial.skipTutorial}
                />
            )}
        </div>
    </div>
  );
}
