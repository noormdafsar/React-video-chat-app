import { Routes, Route } from 'react-router-dom'
import './App.css'
import Home from './pages/Home'
import Room from './pages/Room'
import { SocketProvider } from './providers/socket'

function App() {
  return (
    <div className='min-h-screen w-full bg-gray-700 text-white'>
      <SocketProvider>
        <Routes>
          <Route path='/' element={<Home />} />
          <Route path='/room/:roomId' element={<Room />} />
        </Routes>
      </SocketProvider>
    </div>
  );
}

export default App;
