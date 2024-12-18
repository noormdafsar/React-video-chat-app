import { useState, useEffect } from 'react'
import { useSocket } from '../providers/socket'
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const { socket } = useSocket();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');  // Initialize with empty string
  const [roomId, setRoomId] = useState(''); // Initialize with empty string

  const handleRoomJoined = ({ roomId }) => {
    console.log('Room joined:', roomId);
    navigate(`/room/${roomId}`);
  };
  
  useEffect(() => {
    socket.on('room-joined', handleRoomJoined);
    return () => {
      socket.off('room-joined', handleRoomJoined);
    };
  }, [socket, navigate]);
  
  const handleJoinRoom = () => {
    console.log('Send join request:', { email, roomId });
    if(email && roomId) {
      socket.emit('join-room', {
        emailId: email,
        roomId: roomId,
        userId: socket.id,
      });
    }
  };


  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <div className="flex flex-col items-center justify-center gap-5 border-2 border-white p-10 rounded-lg">
        <input 
          type="email" 
          value={email} 
          onChange={e => setEmail(e.target.value)} 
          placeholder="Enter your email here" 
          className="p-1 b-2 border-violet-100 rounded-lg font-light font-serif text-black" 
        />

        <input 
          type="text" 
          value={roomId} 
          onChange={e => setRoomId(e.target.value)} 
          placeholder="Enter your room code" 
          className="p-1 border-2 rounded-lg font-light font-serif text-black" 
        />

        <button 
          onClick={handleJoinRoom} 
          className="border-2 p-2 pl-2 m-1 pr-20 justify-center items-center font-light font-serif rounded-lg transition-all scale-90 duration-300 ease-in-out hover:bg-white hover:text-black"
        >
          Enter into Room
        </button>
      </div>
    </div>
  );
};

export default Home;
