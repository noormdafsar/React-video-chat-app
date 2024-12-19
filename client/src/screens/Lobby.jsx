import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketProvider";

const LobbyScreen = () => {
  const [email, setEmail] = useState("");
  const [room, setRoom] = useState("");
  const [error, setError] = useState("");

  const socket = useSocket();
  const navigate = useNavigate();

  const handleSubmitForm = useCallback(
    (e) => {
      e.preventDefault();
      setError("");
      socket.emit("room:join", { email, room });
    },
    [email, room, socket]
  );

  const handleJoinRoom = useCallback(
    (data) => {
      const { room } = data;
      navigate(`/room/${room}`);
    },
    [navigate]
  );

  useEffect(() => {
    socket.on("room:join", handleJoinRoom);
    socket.on("room:error", ({ message }) => {
      setError(message);
    });

    return () => {
      socket.off("room:join", handleJoinRoom);
      socket.off("room:error");
    };
  }, [socket, handleJoinRoom]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-2xl p-8 space-y-6">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
          Join Meeting
        </h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmitForm} className="space-y-6">
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 outline-none"
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="room"
              className="block text-sm font-medium text-gray-700"
            >
              Meeting ID
            </label>
            <input
              type="text"
              id="room"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 outline-none"
              placeholder="Enter meeting ID"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition duration-200 transform hover:scale-[1.02]"
          >
            Join Meeting
          </button>
        </form>
      </div>
    </div>
  );
};

export default LobbyScreen;
