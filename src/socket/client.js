const net = require('net');

const client = new net.Socket();

let host = 'localhost', port = 1234;

client.connect(port, host, () => {
    console.log(`client connected to ${host}:${port}`);
    client.write(`Hello, I am TID:1101 on ${client.address().address}`);
});

client.on('data', (data) => {
    console.log(`Client received: ${data}`);
    if (data.toString().endsWith('exit')) {
        client.destroy();
    }
});

// Add a 'close' event handler for the client socket
client.on('close', () => {
    console.log('Client closed');
});
client.on('error', (err) => {
    console.error(err);
});

//
// client.on('data', function (data) {
//     console.log(data.toString());
//     client.end();
// });
//
// client.on('end', function () {
//     console.log('disconnected from server');
// });