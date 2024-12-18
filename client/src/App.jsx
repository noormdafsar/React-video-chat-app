// import React from "react";    // React import removed as it's not used in this file
import { Routes, Route } from 'react-router-dom'
import './App.css'
import Home from './pages/Home'
import { SocketProvider } from './providers/socket' // Import the SocketProvider

function App() {

  return (
    <div className='min-h-screen w-full bg-gray-700 text-white'>

      <SocketProvider>
        <Routes>
          <Route path='/' element={<Home />} />
        </Routes>
      </SocketProvider>
    </div>
  );
}

export default App
