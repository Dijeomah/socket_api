const net = require("net");

const server = net.createServer();

const socketPort = 8080;



server.on("connection", function (socket) {
    let remoteAddress = socket.remoteAddress + ":" + socket.remotePort;
    console.log("New client connection is made %s", remoteAddress);

    // Send ping message every 5 seconds
    const pingInterval = setInterval(() => {
        socket.write('ping');
    }, 5000);

    socket.on("data", function (data) {
        console.log("Data from %s : %s", remoteAddress, data);
        socket.write("Hello " + data);
    });

    socket.on("close", function () {
        console.log("%s closed the connection.", remoteAddress);
    });

    socket.on("error", function (err) {
        console.log("%s error : %s", remoteAddress, err.message);
    });
});

server.listen(socketPort, function () {
    console.log("Socket server 🚀 listening to %j", server.address());
});
