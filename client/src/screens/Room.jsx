import { useEffect, useCallback, useState, useRef } from "react";
import peer from "../service/peer";
import { useSocket } from "../context/SocketProvider";
import { 
  FaMicrophone, FaMicrophoneSlash,
  FaVideo, FaVideoSlash,
  FaDesktop, FaPhoneSlash,
  FaRecordVinyl, FaStopCircle,
  FaUserFriends
} from 'react-icons/fa';

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
  const myVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

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
      
      // Add tracks to peer connection before creating offer
      peer.addTracks(stream);
      
      const offer = await peer.getOffer();
      socket.emit("user:call", { to: remoteSocketId, offer });
      
      setMyStream(stream);
      if (myVideoRef.current) {
        myVideoRef.current.srcObject = stream;
      }
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
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        });
        
        // Add tracks to peer connection
        peer.addTracks(stream);
        
        setMyStream(stream);
        if (myVideoRef.current) {
          myVideoRef.current.srcObject = stream;
        }
        
        console.log(`Incoming Call`, from, offer);
        const ans = await peer.getAnswer(offer);
        socket.emit("call:accepted", { to: from, ans });
      } catch (error) {
        console.error('Error handling incoming call:', error);
      }
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
    },
    [sendStreams]
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
      
      const senders = peer.peer.getSenders();
      const sender = senders.find(s => s.track?.kind === 'video');
      if (sender) {
        sender.replaceTrack(videoTrack);
      }
      
      setMyStream(screenStream);
      if (myVideoRef.current) {
        myVideoRef.current.srcObject = screenStream;
      }
      
      videoTrack.onended = async () => {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: true
        });
        const newVideoTrack = newStream.getVideoTracks()[0];
        const senders = peer.peer.getSenders();
        const sender = senders.find(s => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(newVideoTrack);
        }
        setMyStream(newStream);
        if (myVideoRef.current) {
          myVideoRef.current.srcObject = newStream;
        }
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
    window.location.href = '/';
  };

  useEffect(() => {
    peer.peer.addEventListener("track", async (ev) => {
      const remoteStream = new MediaStream();
      ev.streams[0].getTracks().forEach((track) => {
        remoteStream.addTrack(track);
      });
      console.log("GOT TRACKS!!");
      setRemoteStream(remoteStream);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
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
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
      {/* Premium Header */}
      <div className="bg-black/40 backdrop-blur-sm border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-xl text-white font-semibold">
              {remoteSocketId ? "Meeting Connected" : "Waiting for participants..."}
            </h1>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-500/20 text-green-500' : 'bg-yellow-500/20 text-yellow-500'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-500' : 'bg-yellow-500'
              } animate-pulse`} />
              <span className="text-sm font-medium">
                {connectionStatus === 'connected' ? 'Connected' : 'Connecting...'}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {isRecording && (
              <div className="flex items-center gap-2 bg-red-500/20 text-red-500 px-3 py-1 rounded-full">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-sm font-medium">Recording</span>
              </div>
            )}
            <div className="flex items-center gap-2 bg-blue-500/20 text-blue-500 px-3 py-1 rounded-full">
              <FaUserFriends className="w-4 h-4" />
              <span className="text-sm font-medium">2 Participants</span>
            </div>
            {remoteSocketId && (
              <button
                onClick={handleCallUser}
                disabled={isLoading}
                className={`bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition ${
                  isLoading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Connecting...
                  </span>
                ) : (
                  'Start Call'
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Video Grid */}
      <div className="flex-1 flex flex-col md:flex-row gap-4 p-4 max-w-7xl mx-auto">
        {myStream && (
          <div className="relative flex-1 bg-gray-800 rounded-2xl overflow-hidden shadow-2xl">
            <video
              ref={myVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-lg">
              <span className="text-white text-sm font-medium">You</span>
            </div>
          </div>
        )}
        
        {remoteStream && (
          <div className="relative flex-1 bg-gray-800 rounded-2xl overflow-hidden shadow-2xl">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-lg">
              <span className="text-white text-sm font-medium">Remote User</span>
            </div>
          </div>
        )}
      </div>

      {/* Premium Controls */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-lg border-t border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={toggleAudio}
              className={`flex flex-col items-center gap-2 p-3 rounded-lg transition-all duration-200 ${
                isAudioMuted ? 'bg-red-500/20 text-red-500' : 'bg-gray-700/50 text-white hover:bg-gray-600/50'
              }`}
            >
              {isAudioMuted ? <FaMicrophoneSlash size={24} /> : <FaMicrophone size={24} />}
              <span className="text-xs">{isAudioMuted ? 'Unmute' : 'Mute'}</span>
            </button>

            <button
              onClick={toggleVideo}
              className={`flex flex-col items-center gap-2 p-3 rounded-lg transition-all duration-200 ${
                isVideoOff ? 'bg-red-500/20 text-red-500' : 'bg-gray-700/50 text-white hover:bg-gray-600/50'
              }`}
            >
              {isVideoOff ? <FaVideoSlash size={24} /> : <FaVideo size={24} />}
              <span className="text-xs">{isVideoOff ? 'Start Video' : 'Stop Video'}</span>
            </button>

            <button
              onClick={handleShareScreen}
              className="flex flex-col items-center gap-2 p-3 rounded-lg bg-gray-700/50 text-white hover:bg-gray-600/50 transition-all duration-200"
            >
              <FaDesktop size={24} />
              <span className="text-xs">Share Screen</span>
            </button>

            <button
              onClick={toggleRecording}
              className={`flex flex-col items-center gap-2 p-3 rounded-lg transition-all duration-200 ${
                isRecording ? 'bg-red-500/20 text-red-500' : 'bg-gray-700/50 text-white hover:bg-gray-600/50'
              }`}
            >
              {isRecording ? <FaStopCircle size={24} /> : <FaRecordVinyl size={24} />}
              <span className="text-xs">{isRecording ? 'Stop Recording' : 'Record'}</span>
            </button>

            <button
              onClick={handleEndCall}
              className="flex flex-col items-center gap-2 p-3 rounded-lg bg-red-500/20 text-red-500 hover:bg-red-500/30 transition-all duration-200"
            >
              <FaPhoneSlash size={24} />
              <span className="text-xs">End Call</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomPage;