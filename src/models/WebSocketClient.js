class WebSocketClient {
    constructor() {
        this.ws = new WebSocket('wss://192.168.100.13:8080');
    }

    sendMessage(payload) {
        console.log(payload)
        this.ws.send(JSON.stringify(payload));
    }
}

export default new WebSocketClient();