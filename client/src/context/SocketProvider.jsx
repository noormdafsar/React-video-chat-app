import { createContext, useMemo, useContext } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext(null);

export const useSocket = () => {
  const socket = useContext(SocketContext);
  return socket;
};

export const SocketProvider = ({ children }) => {
    const socket = useMemo(() => {
      const socketInstance = io("http://localhost:3001", {
        transports: ['websocket', 'polling'],
        secure: true,
        rejectUnauthorized: false,
        timeout: 60000,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });
  
      socketInstance.on('connect', () => {
        console.log('Socket connected:', socketInstance.id);
      });
  
      socketInstance.on('connect_error', (error) => {
        console.log('Connection error:', error);
      });
  
      return socketInstance;
    }, []);
  
    return (
      <SocketContext.Provider value={socket}>
        {children}
      </SocketContext.Provider>
    );
  };  

import PropTypes from 'prop-types';

SocketProvider.propTypes = {
  children: PropTypes.node.isRequired,
};