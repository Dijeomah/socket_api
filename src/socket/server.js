const express = require('express');
// import ('node-fetch')  fetch;
// import {fetch} from "node-fetch";
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const net = require('net');
const redis = require('redis');

const app = express();

const server = net.createServer();

const host = 'localhost';
const serverPort = 3000;
const socketPort = 1234;
const redisPort = process.env.REDIS_PORT || 6379;

let clientSocket = null;

const sockets = [];

const redisClient = redis.createClient(redisPort);
redisClient.on('error', err => console.log('Redis Client Error', err));

redisClient.connect();

server.on('connection', (socket) => {
    const clientAddress = `${socket.remoteAddress}:${socket.remotePort}`;

    //TODO: store the client port to redis
    redisClient.set('client_port', `${socket.remotePort}`);

    console.log(`New client connected: ${clientAddress}`);
    sockets.push(socket);

    socket.on('data', (data) => {
        //receive TID from POS should be json
        console.log(socket[Symbol]);

        // console.log(socket.ref()._peername);

        console.log(`Client ${clientAddress}: ${data}`);
        // Write the data back to all the connected clients
        sockets.forEach((sock) => {
            sock.write(`${socket.remoteAddress}:${socket.remotePort} said ${data}\n`);
        });
    });

    // Add a 'close' event handler to this instance of the socket
    socket.on('close', (data) => {
        const index = sockets.findIndex((o) => {
            return o.remoteAddress === socket.remoteAddress && o.remotePort === socket.remotePort;
        });
        if (index !== -1) sockets.splice(index, 1);
        sockets.forEach((sock) => {
            sock.write(`${clientAddress} disconnected\n`);
        });
        console.log(`Connection closed: ${clientAddress}`);
    });

    // Add an 'error' event handler to this instance of the socket
    socket.on('error', (err) => {
        console.log(`Error occurred in ${clientAddress}: ${err.message}`);
    });
});

// Express route for triggering the socket event
// app.get('/trigger', (req, res) => {
//     // Emit a custom event to all connected sockets
//     server.getConnections((err, count) => {
//         if (err) {
//             throw err;
//         }
//
//         for (let i = 0; i < count; i++) {
//             const socket = sockets[i];
//             socket.write('Drame: Event triggered from the server!\r\n');
//         }
//     });
//
//     res.send('Socket event triggered');
// });

// Open Socket connection
async function openSocket(req, res, next) {
    try {

        // Create a new TCP client socket
        clientSocket = new net.Socket();

        // Connect to the server
        clientSocket.connect(socketPort, 'localhost', () => {
            const {terminal_id} = req.params;

            //save TID into the Redis
            redisClient.set('terminal_id', terminal_id);

            console.log('Connected to TCP server');

            console.log('Socket: '+ `${JSON.stringify(sockets)}`);
            res.send(`Socket connection opened for terminal: ${terminal_id}: ${Object.keys(sockets)}`);
        });

        // Handle data received from the server
        clientSocket.on('data', (data) => {
            console.log(`Received data from server: ${data}`);
        });

        // Handle connection close event
        clientSocket.on('close', () => {
            console.log('Connection closed');
            clientSocket = null;
        });

        // Handle error event
        clientSocket.on('error', (err) => {
            console.log(`Error occurred: ${err.message}`);
            res.status(500).send('An error occurred');
        });

        // // Terminal ID
        // const {terminal_id} = req.params;
        //
        // const response = await fetch(`https://v-app.airvend.ng/api/v1/terminal/${terminal_id}`);
        //
        // const terminalData = await response.json();
        //
        // res.send(terminalData);

    } catch (err) {
        console.error(err);
        res.status(500);
    }
}

async function sendDataToClient(req, res) {
    const message = JSON.stringify(req.body);

    const {client_terminal_id} = req.params;
    const client_port = redisClient.get('client_port');
    const {redis_terminal_id} = redisClient.get('terminal_id');

    if (!clientSocket) {
        res.status(400).send('No active socket connection');
        return;
    }
    if (message) {
        //Todo: check if client port is what is in the storage, and if the terminal_id is what is being paid into
        if (client_terminal_id === redis_terminal_id && client_port!==null) {
            // Send data to the server
            clientSocket.write(message);
            res.send('Data sent to server');
        }
    } else {
        res.status(400).send('Bad Request: Missing message in request body');
    }
}

// async function closeSocket(req, res) {
//     try {
//         //check the redis if there is a record for the TID then delete the key.
//         const {client_terminal_id} = req.params;
//         const client_port = await redisClient.get('client_port');
//         const {redis_terminal_id} = await redisClient.get('terminal_id');
//
//         console.log(client_terminal_id + ':' + redis_terminal_id);
//
//         if (client_terminal_id === redis_terminal_id && client_port !== null) {
//             if (clientSocket) {
//                 await redisClient.del('client_port');
//                 await redisClient.del('terminal_id');
//                 clientSocket.end();
//                 res.send('Socket connection closed');
//             } else {
//                 res.send('Invalid terminal/Terminal not match');
//             }
//         } else {
//             res.status(400).send('No active socket connection');
//         }
//     } catch (err) {
//         console.log(err);
//         res.status(500);
//     }
// }

async function closeSocket(req, res) {
    try {
        const { terminal_id } = req.params;

        // Check if the socket for the specified terminal ID exists
        if (sockets.some((socket) => socket.remote_terminal_id === terminal_id)) {
            // Find the socket with the matching terminal ID
            const socket = sockets.find((socket) => socket.remoteTerminalId === terminal_id);

            // Close the socket
            socket.end();

            // Remove the socket from the array
            const index = sockets.indexOf(socket);
            if (index !== -1) sockets.splice(index, 1);

            // Delete the corresponding key from Redis
            await redisClient.del(terminal_id);

            res.send(`Socket connection closed for terminal ID: ${terminal_id}`);
        } else {
            res.status(400).send(`No active socket connection found for terminal ID: ${terminal_id}`);
        }
    } catch (err) {
        console.log(err);
        res.status(500);
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
    console.log(`TCP server listening on ${host}:${socketPort}`);
});

/**
 * Todo:
 * how can i store each data request as a separate data
 * e.g: if i store data into key terminal_id lets say 21038795
 * how can i store another value lets say terminal_id 21000000
 *
 * I want terminal_id 21038795 to still be in the database redis cache(database)
 * */
