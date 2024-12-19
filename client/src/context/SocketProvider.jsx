import { createContext, useMemo, useContext } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext(null);

export const useSocket = () => {
  const socket = useContext(SocketContext);
  return socket;
};

export const SocketProvider = ({ children }) => {
  const socket = useMemo(() => io("localhost:3000"), []);

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