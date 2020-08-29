class WebSocketClient {
    constructor() {
        this.ws = new WebSocket(`wss://${process.env.REACT_APP_API_DOMAIN}`);
    }

    sendMessage(payload) {
        console.log(payload)
        this.ws.send(JSON.stringify(payload));
    }
}

export default new WebSocketClient();