import { useEffect, useCallback, useState, useRef } from "react";
import ReactPlayer from "react-player";
import peer from "../service/peer";
import { useSocket } from "../context/SocketProvider";

const RoomPage = () => {
  const socket = useSocket();
  const [remoteSocketId, setRemoteSocketId] = useState(null);
  const [myStream, setMyStream] = useState();
  const [remoteStream, setRemoteStream] = useState();
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      const mediaRecorder = new MediaRecorder(myStream);
      mediaRecorderRef.current = mediaRecorder;
      const chunks = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `recording-${Date.now()}.webm`;
        a.click();
      };
      
      mediaRecorder.start();
      setIsRecording(true);
    }
  };


  const handleUserJoined = useCallback(({ email, id }) => {
    console.log(`Email ${email} joined room`);
    setRemoteSocketId(id);
  }, []);

  const handleCallUser = useCallback(async () => {
    try {
      setIsLoading(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      const offer = await peer.getOffer();
      socket.emit("user:call", { to: remoteSocketId, offer });
      setMyStream(stream);
      setConnectionStatus('connected');
    } catch (error) {
      console.error('Error starting call:', error);
    } finally {
      setIsLoading(false);
    }
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
    // Clear existing senders before adding new tracks
    const senders = peer.peer.getSenders();
    senders.forEach((sender) => peer.peer.removeTrack(sender));

    // Now add new tracks
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

  const handleShareScreen = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true
      });
      const videoTrack = screenStream.getVideoTracks()[0];
      
      // Replace video track
      const senders = peer.peer.getSenders();
      const sender = senders.find(s => s.track?.kind === 'video');
      if (sender) {
        sender.replaceTrack(videoTrack);
      }
      
      // Update local stream
      setMyStream(screenStream);
      
      // Handle screen share stop
      videoTrack.onended = () => {
        handleCallUser(); // Revert to camera
      };
    } catch (error) {
      console.log('Error sharing screen:', error);
    }
  };

  const toggleAudio = () => {
    if (myStream) {
      const audioTrack = myStream.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setIsAudioMuted(!audioTrack.enabled);
    }
  };

  const toggleVideo = () => {
    if (myStream) {
      const videoTrack = myStream.getVideoTracks()[0];
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoOff(!videoTrack.enabled);
    }
  };

  const handleEndCall = () => {
    if (myStream) {
      myStream.getTracks().forEach(track => track.stop());
    }
    peer.peer.close();
    setMyStream(null);
    setRemoteStream(null);
    setRemoteSocketId(null);
    window.location.href = '/'; // Redirect to home
  };

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
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition"
            >
              Start Call
            </button>
          )}
        </div>
      </div>

      {/* Add below the header */}
      <div className="bg-gray-800 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-500' : 'bg-yellow-500'
            }`} />
            <span className="text-white">
              {connectionStatus === 'connected' ? 'Connected' : 'Connecting...'}
            </span>
          </div>
          {isRecording && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              <span className="text-red-500">Recording</span>
            </div>
          )}
        </div>
      </div>

      {/* Video Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-6xl mx-auto">
        {myStream && (
          <div className="relative bg-gray-800 rounded-xl overflow-hidden aspect-video">
            <ReactPlayer
              playing={!isVideoOff}
              muted={isAudioMuted}
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
              playing={!isVideoOff}
              muted={isAudioMuted}
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
          <button 
            onClick={handleEndCall}
            className="p-4 rounded-full bg-red-600 hover:bg-red-700 text-white transition"
          >
            <span>End Call</span>
          </button>
          <button 
            onClick={toggleAudio}
            className={`p-4 rounded-full ${isAudioMuted ? 'bg-red-600' : 'bg-gray-700'} hover:bg-gray-600 text-white transition`}
          >
            <span>{isAudioMuted ? 'Unmute' : 'Mute'}</span>
          </button>
          <button 
            onClick={toggleVideo}
            className={`p-4 rounded-full ${isVideoOff ? 'bg-red-600' : 'bg-gray-700'} hover:bg-gray-600 text-white transition`}
          >
            <span>{isVideoOff ? 'Start Video' : 'Stop Video'}</span>
          </button>
          
          <button
            onClick={toggleRecording}
            className={`p-4 rounded-full ${isRecording ? 'bg-red-600' : 'bg-gray-700'} hover:bg-gray-600 text-white transition`}
          >
            <span>{isRecording ? 'Stop Recording' : 'Start Recording'}</span>
          </button>
          <button 
            onClick={handleShareScreen}
            className="p-4 rounded-full bg-gray-700 hover:bg-gray-600 text-white transition"
          >
            <span>Share Screen</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoomPage;