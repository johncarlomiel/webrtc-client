class WebSocketClient {
    constructor() {
        let domain = process.env.REACT_APP_API_DOMAIN;

        if (process.env.NODE_ENV !== 'production') {
            domain = '192.168.100.91:8080';
        }

        this.ws = new WebSocket(`wss://${domain}`);
    }


    init() {
        let domain = process.env.REACT_APP_API_DOMAIN;

        if (process.env.NODE_ENV !== 'production') {
            domain = '192.168.100.91:8080';
        }

        this.ws = new WebSocket(`wss://${domain}`);
    }

    sendMessage(payload) {
        console.log(payload)
        this.ws.send(JSON.stringify(payload));
    }
}

export default new WebSocketClient();