import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Observable, Subject } from 'rxjs';
import { LoggerService } from './logger.service';

@Injectable({
    providedIn: 'root',
})
export class SocketService {
    private readonly _ev$ = new Subject<unknown>();
    private readonly url = environment.socketUrl;
    private conn: WebSocket;

    constructor(private readonly logger: LoggerService) {}

    connect(): void {
        this.logger.debug('Connected to WebSocket server');
        const conn = new WebSocket(this.url);
        this.conn = conn;
        this.conn.onmessage = (ev: MessageEvent<unknown>) => {
            this._ev$.next(ev);
        };
    }

    disconnect(): void {
        this.logger.debug('Disconnected to WebSocket server');
        this.conn.close();
    }

    emit(action: string, data: unknown): void {
        this.conn.send(
            JSON.stringify({
                action,
                data: JSON.stringify(data),
            })
        );
    }

    on(): Observable<unknown> {
        return this._ev$.asObservable();
    }
}
