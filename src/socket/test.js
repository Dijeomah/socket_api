const net = require("net");

const port = 5000;

const server = net.createServer();

server.on("connection", function (socket) {
    let remoteAddress = socket.remoteAddress + ":" + socket.remotePort;
    console.log("Client connected on %s", remoteAddress);

    socket.on("data", function (data) {
        console.log("Data from %s: %s", remoteAddress, data.toString());
        socket.write("Hello " + data);
    });

    socket.once("close", function () {
        console.log("Connection from %s closed", remoteAddress);
    });

    server.on("error", (error) => {
        console.log(`Connection ${remoteAddress} Error:${error.message}`);
    });

    socket.on("end", function () {

    });

});


server.listen(port, () => {
    console.log("TCP server is listening to %j", server.address());
});