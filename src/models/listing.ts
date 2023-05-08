import { NotFound } from 'http-errors';
import { pool } from "../db";
import { Outpoint } from "./outpoint";
import { Inscription } from './inscription';

export enum ListingSort {
    recent = 'recent',
    num = 'num',
    price = 'price',
}

export enum SortDirection {
    asc = 'ASC',
    desc = 'DESC',
}

export class Listing {
    txid: string = '';
    vout: number = 0;
    height: number = 0;
    idx: number = 0;
    price: number = 0;
    payout: string = '';
    script: string = '';
    origin: Outpoint = new Outpoint();
    

    static async loadOneByOutpoint(outpoint: Outpoint): Promise<Listing> {
        const { rows } = await pool.query(`
            SELECT *
            FROM ordinal_lock_listings 
            WHERE txid = $1 AND vout = $2`,
            [outpoint.txid, outpoint.vout],
        );
        if (rows.length === 0) {
            throw new NotFound('not-found');
        }
        return Listing.fromRow(rows[0]);
    }

    static async loadOpenListings(): Promise<Inscription[]> {
        const { rows } = await pool.query(`
            SELECT i.id, t.txid, t.vout, i.filehash, i.filesize, i.filetype, t.origin, t.height, t.idx, t.lock, t.spend, i.map, t.listing, l.price, l.payout
            FROM txos t
            JOIN ordinal_lock_listings l ON l.txid=t.txid AND l.vout=t.vout
            JOIN inscriptions i ON i.origin=t.origin
            WHERE t.listing = true AND t.spend = decode('', 'hex')`,
        );
        return rows.map((r: any) => Inscription.fromRow(r));
    }

    static async loadRecentListings(limit: number, offset: number): Promise<Inscription[]> {
        const { rows } = await pool.query(`
            SELECT l.num as id, l.txid, l.vout, i.filehash, i.filesize, i.filetype, i.origin, l.height, l.idx, t.lock, t.spend, i.map, true as listing, l.price, l.payout
            FROM ordinal_lock_listings l
            JOIN inscriptions i ON i.origin=l.origin
            JOIN txos t ON t.txid=l.txid AND t.vout=l.vout
            WHERE l.spend = decode('', 'hex')
            ORDER BY t.height DESC, t.idx DESC
            LIMIT $1 OFFSET $2`,
            [limit, offset],
        );
        return rows.map((r: any) => Inscription.fromRow(r));
    }

    static async loadListingsByNum(limit: number, offset: number, sort = 'DESC'): Promise<Inscription[]> {
        const { rows } = await pool.query(`
            SELECT l.num as id, l.txid, l.vout, i.filehash, i.filesize, i.filetype, i.origin, l.height, l.idx, t.lock, l.spend, i.map, true as listing, l.price, l.payout
            FROM ordinal_lock_listings l
            JOIN inscriptions i ON i.origin=l.origin
            JOIN txos t ON t.txid=l.txid AND t.vout=l.vout
            WHERE l.spend = decode('', 'hex')
            ORDER BY l.num ${sort}
            LIMIT $1 OFFSET $2`,
            [limit, offset],
        );
        return rows.map((r: any) => Inscription.fromRow(r));
    }

    static async loadListingsByPrice(limit: number, offset: number, sort = 'DESC'): Promise<Inscription[]> {
        const { rows } = await pool.query(`
            SELECT l.num as id, l.txid, l.vout, i.filehash, i.filesize, i.filetype, i.origin, l.height, l.idx, t.lock, l.spend, i.map, true as listing, l.price, l.payout
            FROM ordinal_lock_listings l
            JOIN inscriptions i ON i.origin=l.origin
            JOIN txos t ON t.txid=l.txid AND t.vout=l.vout
            WHERE l.spend = decode('', 'hex')
            ORDER BY l.price ${sort}
            LIMIT $1 OFFSET $2`,
            [limit, offset],
        );
        return rows.map((r: any) => Inscription.fromRow(r));
    }

    static async queryListings(sort: ListingSort, dir: SortDirection, limit: number, offset: number): Promise<Inscription[]> {
        let orderBy = 'ORDER BY ';
        switch(sort) {
            case ListingSort.num:
                orderBy += `l.num ${dir || 'DESC'}`;
                break;
            case ListingSort.price:
                orderBy += `l.price ${dir || 'DESC'}`;
                break;
            default:
                orderBy += `l.height ${dir || 'DESC'}, l.idx ${dir || 'DESC'}`;
                
        }
        const { rows } = await pool.query(`
            SELECT l.num as id, l.txid, l.vout, i.filehash, i.filesize, i.filetype, i.origin, l.height, l.idx, t.lock, l.spend, i.map, true as listing, l.price, l.payout
            FROM ordinal_lock_listings l
            JOIN inscriptions i ON i.origin=l.origin
            JOIN txos t ON t.txid=l.txid AND t.vout=l.vout
            WHERE l.spend = decode('', 'hex')
            ${orderBy}
            LIMIT $1 OFFSET $2`,
            [limit, offset],
        );
        return rows.map((r: any) => Inscription.fromRow(r));
    }

    static fromRow(row: any) {
        const listing = new Listing();
        listing.txid = row.txid.toString('hex');
        listing.vout = row.vout;
        listing.height = row.height;
        listing.idx = row.idx;
        listing.price = parseInt(row.price, 10);
        listing.payout = row.payout.toString('base64');
        listing.origin = Outpoint.fromBuffer(row.origin);
        return listing;
    }
}