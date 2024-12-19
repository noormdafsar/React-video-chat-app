// eslint-disable-next-line no-unused-vars
import React, { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useSocket } from '../providers/socket'

const Room = () => {
    const { roomId } = useParams();
    const { socket } = useSocket();

    const handleNewUserJoined = (data) => {
         const { emailId } = data;
        console.log('New user joined:', emailId);
    };

    useEffect(() => {
        socket.on('join-room', handleNewUserJoined );
    }, [ socket ]);
  return (
    <div>
      <h1>Room: {roomId}</h1>
    </div>
  )
}

export default Room;
