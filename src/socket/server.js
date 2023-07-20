const express = require('express');
const net = require('net');
const redis = require('redis');

const app = express();
const port = 3000;

const redisPort = process.env.REDIS_PORT || 6379;

const redisClient = redis.createClient(redisPort);
redisClient.on('error', err => console.log('Redis Client Error', err));

redisClient.connect();

// Create a TCP server
const server = net.createServer();

//const socketConnections = [];

// Socket connection event
server.on('connection', (socket) => {
  console.log('Socket connected');

  // Send socket message
  // socket.write('Hello from the server!\r\n');

  // Event listener for receiving data from the socket
  socket.on('data', (data) => {
    console.log('Received data:', data.toString());
    let check = data.toJSON();
    console.log(check.data);

    if (check.data === "PING") {
      //socketConnections.push(socket);
      redisClient.del(data.tid);
      redisClient.set(data.tid, socket);
    }
  });
  // Event listener for socket connection close
  socket.on('close', () => {
    console.log('Socket disconnected');
  });
});

// Start the server
server.listen(8001, () => {
  console.log('Server started on port 8001');
});

// Express route for triggering the socket event
app.post('/trigger', (req, res) => {
  // Emit a custom event to all connected sockets
  // server.getConnections((err, count) => {
  //     for (let i = 0; i < count; i++) {
  //         const socket = server.connections[i];
  //         socket.write('Event triggered from the server!\r\n');
  //     }
  // });

  console.log(req.body);
  const socket = redisClient.get(req.body.tid);
  if (socket.writable) {
    socket.write(req.body);
  } else {
    console.log("not a valid socket instance")
  }
  res.send('Socket event triggered');
});

// Start the Express server
app.listen(port, () => {
  console.log(`Express server started on port ${port}`);
});