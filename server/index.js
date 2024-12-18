const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();
const { Server } = require('socket.io');
const io = new Server({
  cors: true,
});

const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const emailToSocketMap = new Map();

io.on('connection', (socket) => {
//  console.log(`User connected: ${socket.id}`);
  
  socket.on('join-room', (data) => {
      const { roomId, emailId, userId } = data;
      console.log('Received join request:', { emailId, roomId, userId });
      emailToSocketMap.set(emailId, socket.id);
      socket.join(roomId);
      socket.emit("joined-room", { roomId });
      socket.broadcast.to(roomId).emit('user-joined', { userId, emailId });
      console.log(`User ${emailId} successfully joined room ${roomId}`);
  });
});


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

io.listen(3001);



