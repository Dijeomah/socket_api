const readlineSync = require("readline-sync");
const net = require("net");


const host = "127.0.0.1";
const port = 5000;

// const client = net.createConnection(port, host, () => {
//     console.log("Connected");
//     client.write(`Drame`);
// });

function menu() {
    let lineRead = readlineSync.question("\n\nEnter Option (1-Open, 2-Send, 3-Close, 4-Quit): ");
}

client.on("data", (data) => {
    console.log(`Received: ${data}`);
});

client.on("error", (error) => {
    console.log(`Error: ${error.message}`);
});

client.on("close", () => {
    console.log("Connection closed");
});