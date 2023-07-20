const express = require('express');
const net = require('net');
const redis = require('redis');

const app = express();

const server = net.createServer();

const host = 'localhost';
const serverPort = 3000;
const socketPort = 1234;
const redisPort = process.env.REDIS_PORT || 6379;
const timeOutInMiliseconds = 30 * 60 * 1000  // 30 minutes 

const socketArray = [];

const redisClient = redis.createClient(redisPort);
redisClient.on('error', err => console.log('Redis Client Error', err));

redisClient.connect();

server.on('connection', (socket) => {
    const clientAddress = `${socket.remoteAddress}:${socket.remotePort}`;

    console.log(`New client connected: ${clientAddress}`);

    socket.on('data', (data) => {
        //receive TID from POS should be json
   
        console.log(`Client ${clientAddress}: ${data}`);
        // Write the data back to all the connected clients
        socket.write(data)
    });

    // Add a 'close' event handler to this instance of the socket
    socket.on('close', () => {
        console.log(`Connection closed: ${clientAddress}`);
    });

    // Add an 'error' event handler to this instance of the socket
    socket.on('error', (err) => {
        console.log(`Error occurred in ${clientAddress}: ${err.message}`);
    });
});


// Open Socket connection
async function openSocket(req, res, next) {
    try {
        const { terminal_id } = req.params;

        const redis_tid = await redisClient.get('terminal_id_'+terminal_id)
        console.log("opening tid: ", redis_tid)
        if (redis_tid === terminal_id) {
            console.log("Connection is already open");
            res.send("Connection is already open")
            return;
        }

        // Create a new TCP client socket 
        const clientSocket = new net.Socket();
        // set timeout for socket connection
        clientSocket.setTimeout(timeOutInMiliseconds)

        socketArray.push({ socket: clientSocket, terminal_id: terminal_id});

        // Handle data received from the server
        clientSocket.on('data', (data) => {
            console.log(`Received data from server: ${data} ${clientSocket.address().port}`);
        });

        // Handle connection close event
        clientSocket.on('close', () => {
            console.log('Connection closed');
        });

        // Handle error event
        clientSocket.on('error', (err) => {
            console.log(`Error occurred: ${err.message}`);
            res.status(500).send('An error occurred');
        });

        // Connect to the server
        clientSocket.connect(socketPort, 'localhost', () => {
            //save TID into the Redis
            redisClient.set('terminal_id_' + terminal_id, terminal_id);
            console.log('Connected to TCP server');
            // clientSocket.write(terminal_id);
            res.send(`Socket connection opened for terminal: ${terminal_id}`);
        });

        // Connection timeout 
        clientSocket.on('timeout', async () => {
            await closeSession(terminal_id, "timeout")
        })

    } catch (err) {
        console.error(err);
        res.status(500);
    }
}

async function sendDataToClient(req, res) {
    const message = JSON.stringify(req.body);

    const { terminal_id } = req.params;
    const hasSocket = socketArray.findIndex((socketInfo) => socketInfo.terminal_id === terminal_id)
    if (hasSocket === -1) {
        res.status(400).send('No active socket connection');
        return;
    }
    if (message) {
        const index = socketArray.findIndex((socketInfo) => {
            return socketInfo.terminal_id === terminal_id
        })
        console.log("index: ", index)
        if(index >= 0){
            const socket = socketArray[index].socket
            console.log("socket address ", socket.address().port)
            socket.write(message)
            res.send(message)
        }else {
            res.send("no socket index found")
        }
       
    } else {
        res.status(400).send('Bad Request: Missing message in request body');
    }
}


async function closeSocket(req, res) {
    try {
        const { terminal_id } = req.params;

        // Find the socket with the matching terminal ID
        const socketInfo = socketArray.find((socketInfo) => socketInfo.terminal_id === terminal_id);

        if (await closeSession(terminal_id, "request close socket")) {
            res.send(`Socket connection closed for terminal ID: ${terminal_id}`);
        } else {
            res.status(400).send(`No active socket connection found for terminal ID: ${terminal_id}`);
        }
    } catch (err) {
        console.log(err);
        res.status(500);
    }
}

// close socket connect and remove terminal info from cache 
async function closeSession(terminal_id, message="") {
        // Find the socket with the matching terminal ID
        const socketInfo = socketArray.find((socketInfo) => socketInfo.terminal_id === terminal_id);
        if (socketInfo) {
            console.log("Closing session: ", message)
            // Close the socket
            socketInfo.socket.end();
            // Remove the socket from the array
            const index = socketArray.indexOf(socketInfo);
            if (index !== -1) socketArray.splice(index, 1);
            // Delete the corresponding key from Redis
            await redisClient.del("terminal_id_"+terminal_id);
            return true
        } else {
            return false
        }
}


// Express route for triggering the socket event
app.get('/trigger/:terminal_id', openSocket);

// Express route for receiving data and sending it to the server
app.post('/data/:terminal_id', express.json(), sendDataToClient);

//Close connection
// Express route for closing the active connection
app.get('/close/:terminal_id', closeSocket);

app.listen(serverPort, () => {
    console.log(`Express server started on port: ${serverPort}`);
});

server.listen(socketPort, host, () => {
    console.log(`Socket server listening on ${host}:${socketPort}`);
});