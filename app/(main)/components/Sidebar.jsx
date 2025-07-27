'use client'
import { useRouter } from 'next/navigation';
import React from 'react'

const Sidebar = () => {
    const router = useRouter();
    const navLinks = [
        { name: "Home", path: "/" },
        { name: "Provenance Trace", path: "/trace" },
        { name: "Delay Impact", path: "/impact" },
        { name: "Rerouting Engine", path: "/reroute" },
        { name: "Batch Explorer", path: "/batches" },
        { name: "Dashboard", path: "/dashboard" },
        { name: "About", path: "/about" }
    ];
  return (
    <div className='bg-white shadow-2xl h-screen py-2 w-fit fixed z-1001'>
        <div className='flex flex-col'>
            {navLinks.map((link, i) => (
                <div onClick={() => router.push(link.path)} className='hover:bg-gray-400 text-black px-4 py-2 cursor-pointer transition-all duration-300' key={i}>
                    {link.name}
                </div>
            ))}
        </div>
    </div>
  )
}

export default Sidebar