'use client'
import React, { useState } from 'react'
import batches from '../(data)/batches.json'
import GraphViewer from '../components/GraphViewer';

const page = () => {
  const [batchId, setBatchId] = useState('');
  const [graphData, setGraphData] = useState(null);
  
  const handleSearch = () => {
    const data = batches[batchId];
    if (data) {
      setGraphData(data);
    } else {
      console.log("batch not found");
    }
  }
  return (
    <div className='flex flex-col justify-center items-center h-screen'>
      <h1>Provenance Trace</h1>
      <div className='flex items-center gap-4 mb-6'>
        <input type="text" placeholder='Enter Batch ID' value={batchId} onChange={e => setBatchId(e.target.value)} />
        <button className='bg-blue-400 text-white rounded-2xl px-4 py-2 cursor-pointer hover:bg-blue-500 transition-all duration-300' onClick={handleSearch}>Trace</button>
      </div>

      {graphData && (
        <GraphViewer supplies={graphData.supplies} nodes={graphData.nodes} edges={graphData.edges} />
      )}
    </div>
  )
}

export default page