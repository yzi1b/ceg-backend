import express from 'express';
import routes from './routes/index.js';

export default class Server {
    static port = process.env.WEB_PORT || 8088;

    constructor() {
        this.app = express();
        this.app.use(express.json());
        this.app.use(routes);
    }

    start() {
        this.server = this.app.listen(Server.port, () => {
            console.info(`express server is on：http://localhost:${Server.port}`);
        });
    }
}