import { Controller, Path, Post, Route } from "tsoa";
import { Redis } from "ioredis";

const pubClient = new Redis();

export interface PreviousOutput {
    lockingScript: string,
    satoshis: number
}

@Route("api/tx")
export class TxController extends Controller {
    // @Post()
    // public async broadcast(
    //     @BodyProp() rawtx: string,
    //     @BodyProp() parents?: PreviousOutput[],
    // ): Promise<string> {
    //     const txbuf = Buffer.from(rawtx, 'base64')
    //     const tx = Tx.fromBuffer(txbuf);
    //     console.log('Broadcasting TX:', tx.id(), tx.toHex(), JSON.stringify(parents))

    //     let eftx: Buffer
    //     if (!parents) {
    //         const outputs: {lockingScript: Buffer, satoshis: number}[] = [];
    //         for (let txin of tx.txIns) {
    //             const txid = txin.txHashBuf.reverse().toString('hex');
    //             const txData = await jbClient.GetTransaction(txid);
    //             const prevTx = Tx.fromBuffer(Buffer.from(txData?.transaction || '', 'base64'));
    //             outputs.push({
    //                 lockingScript: prevTx.txOuts[txin.txOutNum].script.toBuffer(),
    //                 satoshis: prevTx.txOuts[txin.txOutNum].valueBn.toNumber(),
    //             })
    //         }
    //         eftx = StandardToExtended(txbuf, outputs) as Buffer;
    //     } else {
    //         eftx = StandardToExtended(
    //             txbuf,
    //             parents.map(p => ({
    //                 lockingScript: Buffer.from(p.lockingScript, 'base64'),
    //                 satoshis: p.satoshis,
    //             }))
    //         ) as Buffer;
    //     }
    //     try {
    //         const resp = await fetch('https://api.taal.com/arc/v1/tx', {
    //             method: 'POST',
    //             headers: {
    //                 Authorization: `Bearer ${process.env.ARC_TOKEN}`,
    //                 ContentType: 'application/octet-stream',
    //                 'X-WaitForStatus': '7'
    //             },
    //             body: eftx,
    //         })
    //         console.log("EFTX:", eftx.toString('hex'))
    //         const respText = await resp.text();
    //         console.log("Broadcast:", respText);
    //         const result = JSON.parse(respText);

    //         if(result.status != 200) {
    //             throw createError(result.status || 500, `Broadcast failed: ${result.detail}`);
    //         }
    
    //         pubClient.publish('tx', txbuf);
    //         return result.txid;
    //     } catch (e) {
    //         console.error("Broadcast Error:", e);
    //         throw e;
    //     }
    // }

    @Post("{txid}/submit")
    public async getTx(
        @Path() txid: string,
    ): Promise<void> {
        pubClient.publish('submit', txid);
    }
}
