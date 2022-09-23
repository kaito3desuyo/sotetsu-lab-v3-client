import { Injectable } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { Observable, Subject } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root',
})
export class SocketService {
    private readonly _ev$ = new Subject<unknown>();
    private readonly url = environment.socketUrl;
    private conn: WebSocket;

    constructor(private readonly logger: NGXLogger) {}

    connect(): void {
        const conn = new WebSocket(this.url);
        this.conn = conn;
        this.conn.onmessage = (ev: MessageEvent<unknown>) => {
            this._ev$.next(ev);
        };
        this.logger.log('SocketService: Connected to WebSocket server');
    }

    disconnect(): void {
        this.conn.close();
        this.logger.log('SocketService: Disconnected to WebSocket server');
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
