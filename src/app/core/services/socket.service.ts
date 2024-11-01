import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { Observable, Subject } from 'rxjs';
import { TokenStateQuery } from 'src/app/global-states/token.state';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root',
})
export class SocketService {
    readonly #platformId = inject(PLATFORM_ID);
    private readonly _tokenStateQuery = inject(TokenStateQuery);
    private readonly _url = environment.socketUrl;
    private readonly _ev$ = new Subject<unknown>();
    private _conn: WebSocket;

    constructor(private readonly logger: NGXLogger) {}

    connect(): void {
        if (!isPlatformBrowser(this.#platformId)) return;
        this._conn = new WebSocket(
            `${this._url}?token=${this._tokenStateQuery.accessToken}`,
        );
        this._conn.onmessage = (ev: MessageEvent<unknown>) => {
            this._ev$.next(ev);
        };
        this.logger.log('SocketService: Connected to WebSocket server');
    }

    disconnect(): void {
        if (!this._conn) return;
        this._conn.close();
        this.logger.log('SocketService: Disconnected to WebSocket server');
    }

    emit(action: string, data: unknown): void {
        if (!this._conn) return;
        this._conn.send(
            JSON.stringify({
                action,
                data: JSON.stringify(data),
            }),
        );
    }

    on(): Observable<unknown> {
        return this._ev$.asObservable();
    }
}
