const express = require('express');
const net = require('net');
const { hostname } = require('os');
const redis = require('redis');

const app = express();
const serverPort = 3000;

const redisPort = process.env.REDIS_PORT || 6379;

const redisClient = redis.createClient(redisPort);

redisClient.on('error', err => console.log('Redis Client Error', err));

redisClient.connect();

const socketServer = net.createServer();

const host = 'localhost';

const socketPort = 8080;

let clientSocket = null;

let remoteAddress = null;

socketServer.on("connection", function (socket) {
    remoteAddress = socket.remoteAddress + ":" + socket.remotePort;

    // redisClient.set('remote_address', remoteAddress);

    console.log("New client connection is made %s", remoteAddress);

    socket.on("data", function (data) {
        console.log("Data from %s : %s", remoteAddress, data);
        socket.write(data);
    });

    socket.on("close", function () {
        console.log("%s closed the connection.", remoteAddress);
    });

    socket.on("error", function (err) {
        console.log("%s error : %s", remoteAddress, err.message);
    });
});

app.get('/trigger/:terminal_id', async (req, res, next) => {
    try {
        const { terminal_id } = req.params;

        const redis_tid = await redisClient.get('terminal_id_' + terminal_id);

        // if (redisClient.get('terminal_id') === terminal_id && clientSocket) {
        if (redis_tid !== terminal_id && clientSocket) {
            console.log("Connection is already open");
            return;
        }

        console.log(redis_tid)

        // Set the redis terminal_id. 
        redisClient.set('terminal_id_' + terminal_id, terminal_id);

        console.log(remoteAddress);

        // Create a new TCP client socket 
        clientSocket = new net.Socket();

        // Handle data received from the server
        clientSocket.on('data', (data) => {
            // res.send(data);
            console.log(`Received data from server: ${data}`);
        });

        clientSocket.on('error', (error) => {
            clientSocket.destroy();
            clientSocket = null;
            console.log("ERROR: Connection could not be opened. MSG: %s", error.message);
        });

        clientSocket.connect(socketPort, host, () => {
            console.log("Connection established");
        });
        res.json("Client oooo");
        return;

    } catch (error) {
        res.send(error.message);
    }
});

app.post('/data/:terminal_id', express.json(), async (req, res, next) => {
    const message = JSON.stringify(req.body);

    const { client_terminal_id } = req.params;
    // const client_address = redisClient.get('client_address');
    // const { redis_terminal_id } = redisClient.get('terminal_id');

    if (!clientSocket) {
        res.status(400).send('No active socket connection');
        return;
    }
    if (message) {

        // if (client_terminal_id === redis_terminal_id) {
        //     console.log(message);
        //     clientSocket.write(message);
        // }
        clientSocket.write(message);


        // if (message) {
        //     console.log();
        //     //Todo: check if client port is what is in the storage, and if the terminal_id is what is being paid into
        //     if (client_terminal_id === redis_terminal_id && client_port === clientSocket._peername.port) {
        //         // Send data to the server
        //         clientSocket.write(message);
        //         res.send('Data sent to server');
        //     }`
        res.send(message);
        return;
    } else {
        res.status(400).send('Bad Request: Missing message in request body');
    }
});

socketServer.listen(socketPort, () => {
    console.log("Socket server 🚀 listening to %j", socketServer.address());
});

app.listen(serverPort, () => {
    console.log(`Express server started on port: ${serverPort}`);
});
