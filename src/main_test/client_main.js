const net = require("net");
const readlineSync = require("readline-sync");


const HOST = "127.0.0.1";
const PORT = 8080;

let client = null;

// Send ping message every 5 seconds
// let pingInterval = setInterval(() => {
//     client.write('pong');
// }, 5000);


function openConnection() {
    if (client) {
        console.log("Connection is already open");
        setTimeout(function () {
            menu();
        }, 0);
        return;
    }

    client = new net.Socket();

    client.on("data", function (data) {
        console.log("Received: %s", data);


        const message = data.toString().trim();
        console.log('Received:', message);

        // Check if the received message is a pong
        if (message === 'ping') {
            // Reset the ping interval timer
            clearInterval(pingInterval);
            pingInterval = setInterval(() => {
                client.write('pong');
            }, 5000);
        }

        setTimeout(function () {
            menu();
        }, 0);
    });

    client.on("error", function (error) {
        client.destroy();
        client = null;
        console.log("ERROR: Connection could not be opened. MSG: %s", error.message);
        setTimeout(function () {
            menu();
        }, 0);
    })

    client.connect(PORT, HOST, function () {
        console.log("Connection established");
        setTimeout(function () {
            menu();
        }, 0);
    });

}

function sendData(data) {
    if (!client) {
        console.log("Connection is not opened or closed.");
        setTimeout(function () {
            menu();
        }, 0);
        return;
    }
    client.write(data);
}

function closeConnection() {
    if (!client) {
        console.log("Connection is not opened or already closed.");
        setTimeout(function () {
            menu();
        }, 0);
        return;
    }
    client.destroy();
    client = null;
    clearInterval(pingInterval);
    console.log("Connection closed");
    setTimeout(function () {
        menu();
    }, 0);
}

function menu() {
    let lineRead = readlineSync.question("\n\nEnter option (1-Open, 2-Send, 3-Close, 4-Quit): ");

    switch (lineRead) {
        case "1":
            openConnection();
            break;
        case "2":
            const data = readlineSync.question("Enter data to send: ");
            sendData(data);
            break;
        case "3":
            closeConnection();
            break;
        case "4":
            return;
            break;
        default:
            setTimeout(function () {
                menu();
            }, 0);
            break;
    }
}

setTimeout(function () {
    menu();
}, 0);