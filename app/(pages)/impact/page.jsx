'use client'
import React, { useState } from 'react'; 
import GraphViewer from '../components/GraphViewer'; 
import batches from '../(data)/batches.json';
import { Minus, Plus } from 'lucide-react';

const ImpactPage = () => { 
    const [batchId, setBatchId] = useState(''); 
    const [graphData, setGraphData] = useState(null);
    const [selectedNode, setSelectedNode] = useState(null);

    const handleSearch = () => { 
        const data = batches[batchId]; 
        if (data) { 
            setGraphData(data); 
        } else { 
            alert('Batch not found!'); 
        } 
    };

    const handleDelayAdd = (nodeId) => {
        setGraphData(prevData => {
            const newData = { ...prevData };
            const visited = new Set();
            const queue = [nodeId];
            
            while (queue.length > 0) {
                const currentId = queue.shift();
                
                if (visited.has(currentId)) continue;
                visited.add(currentId);
                
                newData.edges.forEach(edge => {
                    if (edge.source === currentId && !visited.has(edge.target)) {
                        const match = edge.estimated_duration.match(/\d+/g);
                        if (edge.source == nodeId && match) {
                            const original = Number(match[0]);
                            const updated = original + 1;
                            edge.estimated_duration = `${updated} hours`;
                        }
                        queue.push(edge.target);
                    }
                });
            }
            
            newData.nodes = newData.nodes.map(node => {
                if (visited.has(node.id)) {
                    return {
                        ...node,
                        delay: ((Number(node.delay) || 0) + 1).toString()
                    };
                }
                return node;
            });
            
            return newData;
        });
    };

    const handleDelaySub = (nodeId) => {
        setGraphData(prevData => {
            const newData = { ...prevData };
            const visited = new Set();
            const queue = [nodeId];
            
            while (queue.length > 0) {
                const currentId = queue.shift();
                
                if (visited.has(currentId)) continue;
                visited.add(currentId);
                
                newData.edges.forEach(edge => {
                    if (edge.source === currentId && !visited.has(edge.target)) {
                        const match = edge.estimated_duration.match(/\d+/g);
                        if (edge.source == nodeId && match) {
                            const original = Number(match[0]);
                            const updated = original - 1;
                            edge.estimated_duration = `${updated} hours`;
                        }
                        queue.push(edge.target);
                    }
                });
            }
            
            newData.nodes = newData.nodes.map(node => {
                if (visited.has(node.id)) {
                    return {
                        ...node,
                        delay: ((Number(node.delay) || 0) - 1).toString()
                    };
                }
                return node;
            });
            
            return newData;
        });
    }

    const handleNodeClick = (nodeId) => {
        setSelectedNode(nodeId)
    }

return ( 
    <div className="pl-[150px] flex flex-col justify-center items-center"> 
        <h1 className="text-2xl font-bold mb-4">Delay Impact Analysis</h1>

        <div className="flex items-center gap-4 mb-6">
            <input
            type="text"
            placeholder="Enter Batch ID (e.g. batch-001)"
            value={batchId}
            onChange={e => setBatchId(e.target.value)}
            className="border px-4 py-2 rounded"
            />
            <button onClick={handleSearch} className="bg-yellow-600 text-white px-4 py-2 rounded">
            Analyze
            </button>
        </div>

        {selectedNode && (
            <div className='w-full bg-slate-800 flex flex-col items-center gap-3 p-4'>
                <div className='text-white text-3xl font-semibold text-shadow-[0px_0px_16px_rgb(255,255,255)]'>Test your Delay</div>
                <div className='flex justify-center gap-3'>
                    <button onClick={() => handleDelaySub(selectedNode)} className='p-2 rounded-full text-white text-2xl border border-black bg-emerald-400 cursor-pointer transition-all hover:bg-emerald-500 hover:scale-105 active:scale-95'><Minus /></button>
                    <button onClick={() => handleDelayAdd(selectedNode)} className='p-2 text-white rounded-full text-2xl border border-black bg-emerald-400 cursor-pointer transition-all hover:bg-emerald-500 hover:scale-105 active:scale-95'><Plus /></button>
                </div>
            </div>
        )}

        {graphData && (
            <GraphViewer
            supplies={graphData.supplies}
            nodes={graphData.nodes.map(n => ({
                ...n,
                status: n.delay > "0" ? 'delayed' : n.status
            }))}
            edges={graphData.edges}
            onNodeClick={handleNodeClick}
            />
        )}
    </div>
)};

export default ImpactPage;