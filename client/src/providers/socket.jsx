import React, { useMemo } from 'react';
//import { SocketContext } from '../context/socket';
import { io } from 'socket.io-client';

const SocketContext = new React.createContext(null);

// useSocket.js
// import { SocketContext } from '../context/socket';
export const useSocket = () => {
    const context = React.useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within a SocketProvider');
    }
    return context;
};

export const SocketProvider = ( props ) => {
    const socket = useMemo( 
        () => 
            io('http://localhost:3001'),
            []
    );
    return (
        <SocketContext.Provider value={{socket}}>
            {props.children}
        </SocketContext.Provider>
    )
}

import PropTypes from 'prop-types';

SocketProvider.propTypes = {
    children: PropTypes.node.isRequired,
};