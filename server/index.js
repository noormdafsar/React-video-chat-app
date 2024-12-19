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

const emailToSocketIdMap = new Map();
const socketidToEmailMap = new Map();

io.on("connection", (socket) => {
  console.log(`Socket Connected`, socket.id);
  socket.on("room:join", (data) => {
    const { email, room } = data;
    emailToSocketIdMap.set(email, socket.id);
    socketidToEmailMap.set(socket.id, email);
    io.to(room).emit("user:joined", { email, id: socket.id });
    socket.join(room);
    io.to(socket.id).emit("room:join", data);
  });

  socket.on("user:call", ({ to, offer }) => {
    io.to(to).emit("incomming:call", { from: socket.id, offer });
  });

  socket.on("call:accepted", ({ to, ans }) => {
    io.to(to).emit("call:accepted", { from: socket.id, ans });
  });

  socket.on("peer:nego:needed", ({ to, offer }) => {
    console.log("peer:nego:needed", offer);
    io.to(to).emit("peer:nego:needed", { from: socket.id, offer });
  });

  socket.on("peer:nego:done", ({ to, ans }) => {
    console.log("peer:nego:done", ans);
    io.to(to).emit("peer:nego:final", { from: socket.id, ans });
  });
});


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

io.listen(3000);



