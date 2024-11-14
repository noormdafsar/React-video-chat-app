import React, { useMemo } from 'react';
//import { SocketContext } from '../context/socket';
import { io } from 'socket.io-client';

const SocketContext = new React.createContext(null);

export const useSocket = () => {
    const context = React.useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within a SocketProvider');
    }
    return context;
};

export const SocketProvider = (props) = () => {
    const socket = useMemo( 
        () => 
        io({
            host: 'localhost',
            port: 3001,
        }),
        []
    );
    return (
        <SocketContext.Provider value={{socket}}>
            {props.children}
        </SocketContext.Provider>
    )
}