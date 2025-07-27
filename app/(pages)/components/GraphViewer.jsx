import cytoscape from 'cytoscape';
import React, { useEffect, useRef, useState, useMemo } from 'react';


const GraphViewer = ({ supplies = [], nodes = [], edges = [], onNodeClick = () => {}, delay = 0 }) => { 
  const cyRef = useRef(null);
  const [cy, setCy] = useState(null);

  const totalDuration = useMemo(() => {
    const getDuration = (edge) => {
      return Number(edge.estimated_duration?.match(/\d+/g)?.[0] || 0);
    };

    const getNodeDelay = (nodeId) => {
      const node = nodes.find(n => n.id === nodeId);
      return Number(node?.delay || 0);
    };

    const graph = {};
    const incomingEdges = new Set();
    
    edges.forEach(edge => {
      if (!graph[edge.source]) graph[edge.source] = [];
      graph[edge.source].push({
        target: edge.target,
        duration: getDuration(edge),
        edgeId: `${edge.source}-${edge.target}`
      });
      incomingEdges.add(edge.target);
    });

    const allNodes = new Set([...edges.map(e => e.source), ...edges.map(e => e.target)]);
    const rootNodes = Array.from(allNodes).filter(node => !incomingEdges.has(node));
    const leafNodes = Array.from(allNodes).filter(node => !graph[node] || graph[node].length === 0);

    const findAllPaths = () => {
      const pathDetails = [];

      const dfs = (node, currentDuration, visited, currentPath) => {
        if (leafNodes.includes(node)) {
          const totalWithDelay = currentDuration + getNodeDelay(node);
          pathDetails.push({
            duration: totalWithDelay,
            path: [...currentPath],
            nodes: [...visited]
          });
          return;
        }

        if (graph[node]) {
          graph[node].forEach(({ target, duration, edgeId }) => {
            if (!visited.has(target)) { 
              visited.add(target);
              const nodeDelay = getNodeDelay(node);
              dfs(
                target, 
                currentDuration + duration + nodeDelay, 
                visited, 
                [...currentPath, edgeId]
              );
              visited.delete(target);
            }
          });
        }
      };

      rootNodes.forEach(root => {
        const visited = new Set([root]);
        dfs(root, 0, visited, []);
      });

      return pathDetails;
    };

    const allPathDetails = findAllPaths();
    const minDuration = allPathDetails.length > 0 ? Math.min(...allPathDetails.map(p => p.duration)) : 0;
    const shortestPath = allPathDetails.find(p => p.duration === minDuration);
    
    return {
      minDuration, 
      shortestPathEdges: shortestPath?.path || [],
      shortestPathNodes: shortestPath?.nodes || [],
      allPaths: allPathDetails
    };
  }, [edges, nodes]);

  const totalDelayHours = useMemo(() => {
    return Number(nodes.find(node => node.type === 'destination')?.delay || 0);
  }, [nodes]);

  const getNodeTypes = useMemo(() => {
    const nodeTypes = {};
    
    nodes.forEach(node => {
      const outgoingEdges = edges.filter(e => e.source === node.id);
      const incomingEdges = edges.filter(e => e.target === node.id);
      
      nodeTypes[node.id] = {
        isSplit: outgoingEdges.length > 1,
        isMerge: incomingEdges.length > 1,
        isSource: incomingEdges.length === 0,
        isDestination: outgoingEdges.length === 0
      };
    });
    
    return nodeTypes;
  }, [nodes, edges]);
  
  useEffect(() => { 
    if (!cyRef.current || !nodes.length) return;

    const cyUse = cytoscape({
      container: cyRef.current,
      elements: [
        ...nodes.map(n => {
          const nodeType = getNodeTypes[n.id] || {};
          const delay = Number(n.delay) || 0;
          const isOnShortestPath = totalDuration.shortestPathNodes.includes(n.id);
          
          return {
            data: {
              id: n.id,
              label: `${n.label}\n${new Date(n.timestamp).getHours()}:${String(new Date(n.timestamp).getMinutes()).padStart(2, '0')}\n${n.location}${delay > 0 ? `\nDelay: +${delay}h` : ''}`,
              timestamp: n.timestamp,
              location: n.location,
              temperature: n.temperature,
              humidity: n.humidity,
              status: n.status,
              delay: delay,
              nodeType: nodeType,
              isSplit: nodeType.isSplit,
              isMerge: nodeType.isMerge,
              isSource: nodeType.isSource,
              isDestination: nodeType.isDestination,
              isOnShortestPath: isOnShortestPath
            }
          };
        }),
        ...edges.map(e => {
          const edgeId = `${e.source}-${e.target}`;
          const isOnShortestPath = totalDuration.shortestPathEdges.includes(edgeId);
          
          return {
            data: { 
              source: e.source, 
              target: e.target, 
              estimated_duration: e.estimated_duration,
              quantity_percentage: e.quantity_percentage || '100',
              mode_of_transport: e.mode_of_transport || 'Truck',
              isOnShortestPath: isOnShortestPath
            }
          };
        })
      ],
      style: [
        {
          selector: "core",
          style: {
            "selection-box-color": "#3b82f6",
            "selection-box-border-color": "#1d4ed8",
            "selection-box-opacity": "0.3"
          }
        },
        {
          selector: "node",
          style: {
            "width": "140px",
            "height": "90px",
            "shape": function(ele) {
              const data = ele.data();
              if (data && data.isSplit) return 'diamond';
              if (data && data.isMerge) return 'octagon';
              if (data && data.isSource) return 'ellipse';
              if (data && data.isDestination) return 'square';
              return 'round-rectangle';
            },
            "label": "data(label)",
            "font-size": "10px",
            "font-weight": "600",
            "text-valign": "center",
            "text-halign": "center",
            "text-wrap": "wrap",
            "text-max-width": "120px",
            "opacity": function(ele) {
              const data = ele.data();
              return (data && data.isOnShortestPath) ? 1.0 : 0.6;
            },
            "background-color": function(ele) {
              const data = ele.data();
              if (!data) return '#3b82f6';
              
              const delay = data.delay || 0;
              const status = data.status;
              const isOnShortestPath = data.isOnShortestPath;
              
              let baseColor;
              if (delay > 0) baseColor = '#f59e0b';
              else if (status === 'spoiled') baseColor = '#dc2626';
              else if (status === 'active') baseColor = '#059669'; 
              else if (data.isSplit) baseColor = '#8b5cf6'; 
              else if (data.isMerge) baseColor = '#06b6d4'; 
              else baseColor = '#3b82f6';
              
              return baseColor;
            },
            "background-gradient-direction": "to-bottom",
            "background-gradient-stop-colors": function(ele) {
              const data = ele.data();
              if (!data) return '#3b82f6 #60a5fa';

              const delay = data.delay || 0;
              const status = data.status;
              const isOnShortestPath = data.isOnShortestPath;

              let colors;
              if (delay > 0) colors = ['#f59e0b', '#fbbf24'];
              else if (status === 'spoiled') colors = ['#dc2626', '#ef4444'];
              else if (status === 'active') colors = ['#059669', '#10b981'];
              else if (data.isSplit) colors = ['#8b5cf6', '#a855f7'];
              else if (data.isMerge) colors = ['#06b6d4', '#0891b2'];
              else colors = ['#3b82f6', '#60a5fa'];

              if (!Array.isArray(colors) || colors.length !== 2) {
                colors = ['#3b82f6', '#60a5fa'];
              }

              return colors.join(' ')
            },
            "text-outline-color": "rgba(0,0,0,0.8)",
            "text-outline-width": "1px",
            "color": "#ffffff",
            "border-width": function(ele) {
              const data = ele.data();
              if (!data) return 2;
              
              const baseWidth = (data.isSplit || data.isMerge) ? 3 : 2;
              return data.isOnShortestPath ? baseWidth + 1 : baseWidth;
            },
            "border-color": function(ele) {
              const data = ele.data();
              if (!data) return "#ffffff";
              
              if (data.isOnShortestPath) return "#ffd700";
              if (data.isSplit) return "#8b5cf6";
              if (data.isMerge) return "#06b6d4";
              return "#ffffff";
            },
            "border-opacity": function(ele) {
              const data = ele.data();
              return (data && data.isOnShortestPath) ? 1.0 : 0.8;
            },
          }
        },
        {
          selector: "node:selected",
          style: {
            "border-width": "4px",
            "border-color": "#fff",
            "border-opacity": "1",
            "box-shadow": "0 0 20px rgba(255,255,255,0.5)"
          }
        },
        {
          selector: "edge",
          style: {
            "curve-style": "bezier",
            "control-point-step-size": "60px",
            "opacity": function(ele) {
              const data = ele.data();
              return (data && data.isOnShortestPath) ? 1.0 : 0.4;
            },
            "line-color": function(ele) {
              const data = ele.data();
              if (!data) return '#64748b';
              
              const percentage = data.quantity_percentage;
              const isOnShortestPath = data.isOnShortestPath;
              
              let baseColor;
              if (percentage && percentage !== '100') {
                baseColor = '#f59e0b';
              } else {
                baseColor = '#64748b';
              }
              
              return isOnShortestPath ? '#ffd700' : baseColor;
            },
            "width": function(ele) {
              const data = ele.data();
              if (!data) return 2;
              
              const percentage = Number(data.quantity_percentage || 100);
              const baseWidth = Math.max(2, Math.floor(percentage / 25));
              return data.isOnShortestPath ? baseWidth + 2 : baseWidth;
            },
            "target-arrow-shape": "triangle",
            "target-arrow-color": function(ele) {
              const data = ele.data();
              if (!data) return '#64748b';
              
              const percentage = data.quantity_percentage;
              const isOnShortestPath = data.isOnShortestPath;
              
              let baseColor;
              if (percentage && percentage !== '100') {
                baseColor = '#f59e0b';
              } else {
                baseColor = '#64748b';
              }
              
              return isOnShortestPath ? '#ffd700' : baseColor;
            },
            "label": "data(estimated_duration)",  
            "font-size": function(ele) {
              const data = ele.data();
              return (data && data.isOnShortestPath) ? "11px" : "9px";
            },
            "font-weight": function(ele) {
              const data = ele.data();
              return (data && data.isOnShortestPath) ? "bold" : "600";
            },
            "text-background-color": function(ele) {
              const data = ele.data();
              return (data && data.isOnShortestPath) ? "#ffd700" : "#ffffff";
            },
            "text-background-opacity": function(ele) {
              const data = ele.data();
              return (data && data.isOnShortestPath) ? 1.0 : 0.95;
            },
            "text-background-padding": "4px",
            "text-background-shape": "circle",
            "color": function(ele) {
              const data = ele.data();
              return (data && data.isOnShortestPath) ? "#000000" : "#374151";
            },
            "text-border-color": function(ele) {
              const data = ele.data();
              return (data && data.isOnShortestPath) ? "#ffed4e" : "#e5e7eb";
            },
            "text-border-width": function(ele) {
              const data = ele.data();
              return (data && data.isOnShortestPath) ? "2px" : "1px";
            },
            "text-border-opacity": "1",
          }
        },
        {
          selector: ".highlighted",
          style: {
            "z-index": "999999",
            "line-color": "#f59e0b",
            "target-arrow-color": "#f59e0b",
            "width": "5px"
          }
        },
      ],
      layout: {
        name: 'breadthfirst',
        fit: true,
        directed: true,
        padding: 60,
        spacingFactor: 2,
        avoidOverlap: true,
        nodeDimensionsIncludeLabels: true
      },
      zoom: 1,
      pan: { x: 0, y: 0 }
    });

    if (onNodeClick) {
      cyUse.on('tap', 'node', (evt) => {
        const clickedNode = evt.target;
        
        onNodeClick(clickedNode.id());
      });
    }

    setCy(cyUse);
    return () => cyUse.destroy();
  }, [nodes, edges, getNodeTypes, onNodeClick, totalDuration]);

  useEffect(() => {
    if (!cy) return;

    setTimeout(() => {
      cy.fit();
      cy.center();
    }, 100);
  }, [cy, nodes]);

  const getStatusColor = (status, delay = 0) => {
    if (delay > 0) return 'bg-amber-500';
    switch(status) {
      case 'active': return 'bg-emerald-500';
      case 'delayed': return 'bg-amber-500';
      case 'spoiled': return 'bg-red-500';
      default: return 'bg-blue-500';
    }
  };

  const getStatusIcon = (status, delay = 0) => {
    if (delay > 0) return '⏱';
    switch(status) {
      case 'active': return '✓';
      case 'delayed': return '⏱';
      case 'spoiled': return '⚠';
      default: return '●';
    }
  };

  const getNodeTypeIcon = (nodeType) => {
    if (nodeType.isSplit) return '◊';
    if (nodeType.isMerge) return '⬟';
    if (nodeType.isSource) return '●';
    if (nodeType.isDestination) return '■';
    return '○';
  };

  const sampleSupplies = supplies;

  const sampleNodes = nodes; 

  const sampleEdges = edges;

  return (
    <div className='bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 w-full min-h-screen'>
      <div className='bg-white/5 backdrop-blur-sm border-b border-white/10 p-6'>
        <h1 className='text-3xl font-bold text-white mb-6 text-center'>
          Supply Chain Network
        </h1>
        
        <div className='grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6'>
          {sampleSupplies.map((supply, i) => (
            <div key={i} className='bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl px-6 py-4 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105'>
              <div className='text-white font-semibold text-lg'>{supply.id}</div>
              <div className='text-blue-100 text-sm'>Qty: {supply.quantity}</div>
              <div className='text-blue-100 text-xs'>Life: {supply.life}h</div>
            </div>
          ))}
          
          <div className='bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl px-6 py-4 shadow-lg'>
            <div className='text-white font-semibold text-lg'>Shortest Path</div>
            <div className='text-purple-100 text-sm'>{totalDuration.minDuration} Hours</div>
            <div className='text-purple-200 text-xs'>Including delays</div>
          </div>
          
          <div className='bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl px-6 py-4 shadow-lg'>
            <div className='text-white font-semibold text-lg'>Total Delays</div>
            <div className='text-amber-100 text-sm'>+{totalDelayHours} Hours</div>
          </div>
          
          <div className='bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl px-6 py-4 shadow-lg'>
            <div className='text-white font-semibold text-lg'>All Paths</div>
            <div className='text-emerald-100 text-sm'>{totalDuration.allPaths.length} Found</div>
          </div>
        </div>
      </div>

      <div className='p-6'>
        <div className='bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 shadow-2xl overflow-hidden'>
          <div 
            ref={cyRef} 
            className='w-full bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 flex items-center justify-center text-white'
            style={{ height: '700px' }} 
          >
            <div className='text-center'>
              <div className='text-2xl mb-4'>📊 Supply Chain Graph</div>
              <div className='text-gray-400'>Graph visualization would render here with actual Cytoscape.js</div>
              <div className='text-sm text-gray-500 mt-2'>
                Nodes: {sampleNodes.length} | Edges: {sampleEdges.length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {sampleNodes.length > 0 && (
        <div className='p-6'>
          <div className='bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6'>
            <h3 className='text-xl font-semibold text-white mb-4'>Network Nodes</h3>
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
              {sampleNodes.map((node, i) => {
                const nodeType = getNodeTypes[node.id] || {};
                const delay = Number(node.delay) || 0;
                const isOnShortestPath = totalDuration.shortestPathNodes.includes(node.id);
                
                return (
                  <div key={i} className={`rounded-xl p-4 hover:bg-white/15 transition-all duration-300 ${
                    isOnShortestPath ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-white/10'
                  }`}>
                    <div className='flex items-center gap-3 mb-3'>
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(node.status, delay)}`}></div>
                      <span className='text-white font-semibold'>{node.label}</span>
                      <span className='text-lg'>{getNodeTypeIcon(nodeType)}</span>
                      {isOnShortestPath && <span className='text-yellow-400 text-sm'>⚡ Shortest Path</span>}
                    </div>
                    <div className='space-y-2 text-sm'>
                      <div className='text-gray-300'>
                        <span className='text-gray-400'>Location:</span> {node.location}
                      </div>
                      <div className='text-gray-300'>
                        <span className='text-gray-400'>Temperature:</span> {node.temperature}
                      </div>
                      <div className='text-gray-300'>
                        <span className='text-gray-400'>Humidity:</span> {node.humidity}
                      </div>
                      {delay > 0 && (
                        <div className='text-amber-300'>
                          <span className='text-amber-400'>Delay:</span> +{delay} hours
                        </div>
                      )}
                      <div className='text-gray-300'>
                        <span className='text-gray-400'>Status:</span> 
                        <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${delay > 0 ? 'bg-amber-500/20 text-amber-300' : node.status === 'active' ? 'bg-emerald-500/20 text-emerald-300' : node.status === 'delayed' ? 'bg-amber-500/20 text-amber-300' : 'bg-red-500/20 text-red-300'}`}>
                          {getStatusIcon(node.status, delay)} {delay > 0 ? 'delayed' : node.status}
                        </span>
                      </div>
                      {(nodeType.isSplit || nodeType.isMerge || nodeType.isSource || nodeType.isDestination) && (
                        <div className='text-blue-300'>
                          <span className='text-blue-400'>Type:</span> 
                          <span className='ml-2 px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300'>
                            {nodeType.isSource && 'Source'}
                            {nodeType.isSplit && 'Split Point'}
                            {nodeType.isMerge && 'Merge Point'}
                            {nodeType.isDestination && 'Destination'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GraphViewer;