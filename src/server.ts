import { Address } from '@ts-bitcoin/core';
import { createHash } from 'crypto';
import * as cors from 'cors';
import * as dotenv from 'dotenv';
dotenv.config();
import * as express from 'express';
import { ErrorRequestHandler, Request, Response, NextFunction } from 'express';
import { HttpError, NotFound } from 'http-errors';
import "isomorphic-fetch";
import * as swaggerUi from 'swagger-ui-express'
import { RegisterRoutes } from "./build/routes";
import Redis from "ioredis";

const server = express();
const pubClient = new Redis();

async function main() {
    const PORT = process.env.PORT || 8080;
    server.listen(PORT, () => {
        console.log(`Server listening on port ${PORT}`);
    });
}


server.set('trust proxy', true);
server.use(cors({
    origin: true,
}));
server.use(express.json({ limit: '50mb' }));
server.use((req, res, next) => {
    console.log(req.path, req.method);
    next();
})

server.use("/api/subscribe", (req, res, next) => {
    try {
        let channels: string[] = []
        let addresses: string[] = [];
        const addressMap = new Map<string, string>();
        if(Array.isArray(req.query['address'])) {
            addresses = req.query['address'] as string[];
        } else if(typeof req.query['address'] == 'string') {
            addresses = [req.query['address']]
        }
        for( let a of addresses) {
            const lock = createHash('sha256')
                .update(Address.fromString(a).toTxOutScript().toBuffer())
                .digest()
                .reverse()
                .toString('hex')
            channels.push(lock)
            addressMap.set(lock, a)
        }
        if(Array.isArray(req.query['lock'])) {
            channels.push(...req.query['lock'] as string[]);
        } else if(typeof req.query['lock'] == 'string') {
            channels.push(req.query['lock']);
        }


        // console.log('Channels:', channels)
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Connection': 'keep-alive',
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no'
        });
        const subClient = pubClient.duplicate();
        subClient.subscribe(...channels);
        const interval = setInterval(() => res.write('event: ping\n'), 5000)

        res.on("close", () => {
            clearInterval(interval)
            subClient.quit()
        })

        subClient.on("message", (channel, message) => {
            channel = addressMap.has(channel) ?
                addressMap.get(channel) as string :
                channel;
            res.write(`event: ${channel}\n\n`)
            res.write(`data: ${message}\n`)
            const m = JSON.parse(message)
            res.write(`id: ${m.txid}_${m.vout}\n`)
        });
        // setTimeout(() => res.end(), 60000)
    } catch(e: any) {
        return next(e);
    }
});

server.use("/api/docs",
    swaggerUi.serve,
    async (_req: Request, res: Response) => {
        return res.send(
            swaggerUi.generateHTML(await import("./build/swagger.json"))
        );
    });

RegisterRoutes(server);

server.use((req, res, next) => {
    console.log(req.path)
    next(new NotFound("Not Found"));
});
const errorMiddleware = ((err: TypeError | HttpError, req: Request, res: Response, next: NextFunction) => {
    console.error(req.path, (err as HttpError).status || 500, err);
    res.status((err as HttpError).status || 500).json({ message: err.message })
}) as ErrorRequestHandler

server.use(errorMiddleware);

main().catch(console.error);