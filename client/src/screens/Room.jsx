import { useEffect, useCallback, useState } from "react";
import ReactPlayer from "react-player";
import peer from "../service/peer";
import { useSocket } from "../context/SocketProvider";

const RoomPage = () => {
  const socket = useSocket();
  const [remoteSocketId, setRemoteSocketId] = useState(null);
  const [myStream, setMyStream] = useState();
  const [remoteStream, setRemoteStream] = useState();

  const handleUserJoined = useCallback(({ email, id }) => {
    console.log(`Email ${email} joined room`);
    setRemoteSocketId(id);
  }, []);

  const handleCallUser = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    const offer = await peer.getOffer();
    socket.emit("user:call", { to: remoteSocketId, offer });
    setMyStream(stream);
  }, [remoteSocketId, socket]);

  const handleIncommingCall = useCallback(
    async ({ from, offer }) => {
      setRemoteSocketId(from);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      setMyStream(stream);
      console.log(`Incoming Call`, from, offer);
      const ans = await peer.getAnswer(offer);
      socket.emit("call:accepted", { to: from, ans });
    },
    [socket]
  );

  const sendStreams = useCallback(() => {
    for (const track of myStream.getTracks()) {
      peer.peer.addTrack(track, myStream);
    }
  }, [myStream]);

  const handleCallAccepted = useCallback(
    ({ ans }) => {
      peer.setLocalDescription(ans);
      console.log("Call Accepted!");
      sendStreams();
    },    [sendStreams]
  );

  const handleNegoNeeded = useCallback(async () => {
    const offer = await peer.getOffer();
    socket.emit("peer:nego:needed", { offer, to: remoteSocketId });
  }, [remoteSocketId, socket]);

  useEffect(() => {
    peer.peer.addEventListener("negotiationneeded", handleNegoNeeded);
    return () => {
      peer.peer.removeEventListener("negotiationneeded", handleNegoNeeded);
    };
  }, [handleNegoNeeded]);

  const handleNegoNeedIncomming = useCallback(
    async ({ from, offer }) => {
      const ans = await peer.getAnswer(offer);
      socket.emit("peer:nego:done", { to: from, ans });
    },
    [socket]
  );

  const handleNegoNeedFinal = useCallback(async ({ ans }) => {
    await peer.setLocalDescription(ans);
  }, []);

  useEffect(() => {
    peer.peer.addEventListener("track", async (ev) => {
      const remoteStream = ev.streams;
      console.log("GOT TRACKS!!");
      setRemoteStream(remoteStream[0]);
    });
  }, []);

  useEffect(() => {
    socket.on("user:joined", handleUserJoined);
    socket.on("incomming:call", handleIncommingCall);
    socket.on("call:accepted", handleCallAccepted);
    socket.on("peer:nego:needed", handleNegoNeedIncomming);
    socket.on("peer:nego:final", handleNegoNeedFinal);

    return () => {
      socket.off("user:joined", handleUserJoined);
      socket.off("incomming:call", handleIncommingCall);
      socket.off("call:accepted", handleCallAccepted);
      socket.off("peer:nego:needed", handleNegoNeedIncomming);
      socket.off("peer:nego:final", handleNegoNeedFinal);
    };
  }, [
    socket,
    handleUserJoined,
    handleIncommingCall,
    handleCallAccepted,
    handleNegoNeedIncomming,
    handleNegoNeedFinal,
  ]);

  return (
    <div className="min-h-screen bg-gray-900 p-4 md:p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 bg-gray-800 p-4 rounded-lg">
        <h1 className="text-xl text-white font-semibold">
          {remoteSocketId ? "Meeting Connected" : "Waiting for participants..."}
        </h1>
        <div className="flex gap-3">
          {myStream && (
            <button 
              onClick={sendStreams}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
            >
              Share Screen
            </button>
          )}
          {remoteSocketId && (
            <button 
              onClick={handleCallUser}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition"
            >
              Start Call
            </button>
          )}
        </div>
      </div>

      {/* Video Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-6xl mx-auto">
        {myStream && (
          <div className="relative bg-gray-800 rounded-xl overflow-hidden aspect-video">
            <ReactPlayer
              playing
              muted
              height="100%"
              width="100%"
              url={myStream}
              className="absolute top-0 left-0"
            />
            <div className="absolute bottom-4 left-4 bg-black/50 px-3 py-1 rounded-lg">
              <span className="text-white text-sm">You</span>
            </div>
          </div>
        )}
        
        {remoteStream && (
          <div className="relative bg-gray-800 rounded-xl overflow-hidden aspect-video">
            <ReactPlayer
              playing
              muted
              height="100%"
              width="100%"
              url={remoteStream}
              className="absolute top-0 left-0"
            />
            <div className="absolute bottom-4 left-4 bg-black/50 px-3 py-1 rounded-lg">
              <span className="text-white text-sm">Remote User</span>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-800 p-4">
        <div className="flex justify-center gap-4 max-w-md mx-auto">
          <button className="p-4 rounded-full bg-red-600 hover:bg-red-700 text-white transition">
            <span className="sr-only">End Call</span>
            📞
          </button>
          <button className="p-4 rounded-full bg-gray-700 hover:bg-gray-600 text-white transition">
            <span className="sr-only">Toggle Mic</span>
            🎤
          </button>
          <button className="p-4 rounded-full bg-gray-700 hover:bg-gray-600 text-white transition">
            <span className="sr-only">Toggle Camera</span>
            📹
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoomPage;