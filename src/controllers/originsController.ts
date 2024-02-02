import { NotFound } from 'http-errors';
import { Controller, Get, Path, Route } from "tsoa";
import { pool } from "../db";
import { Claim, Txo } from '../models/txo';
import { Outpoint } from '../models/outpoint';

@Route("api/origins")
export class OriginsController extends Controller {
    @Get("{origin}/claims")
    public async getClaims(
        @Path() origin: string,
    ): Promise<Claim[]> {
        const { rows } = await pool.query(`
            SELECT t.data->'claims' as oclaims
            FROM txos t
            WHERE origin = $1 AND data->'claims' IS NOT NULL`, 
            [Outpoint.fromString(origin).toBuffer()],
        )

        const claims: Claim[] = [];
        rows.forEach(({oclaims}) => claims.push(...oclaims))
        return claims;
    }

    @Get("count")
    public async getCount(): Promise<{count: number}> {
        const { rows: [{count}] } = await pool.query(`SELECT MAX(num) as count FROM inscriptions`);
        return {count};
    }

    @Get("num/{num}")
    public async getOriginByNum(
        @Path() num: string,
    ): Promise<Txo> {
        this.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
        const [height, idx, vout] = num.split(':')
        const {rows: [latest]} = await pool.query(`
            SELECT t.*, o.data as odata, o.height as oheight, o.idx as oidx, o.vout as ovout
            FROM txos t
            JOIN txos o ON o.outpoint = t.origin

            WHERE t.spend = '\\x' AND o.height=$1 AND o.idx=$2 AND o.vout=$3
            ORDER BY t.height DESC, t.idx DESC`,
            [height, idx, vout]
        );

        if(!latest) {
            throw new NotFound();
        }
        return Txo.fromRow(latest);
    }
}