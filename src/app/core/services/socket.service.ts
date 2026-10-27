import { isPlatformBrowser } from '@angular/common';
import { Injectable, Injector, PLATFORM_ID, inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { NGXLogger } from 'ngx-logger';
import { Observable, Subject, filter, take } from 'rxjs';
import { TokenState } from 'src/app/global-states/token.state';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root',
})
export class SocketService {
    readonly #logger = inject(NGXLogger);

    readonly #platformId = inject(PLATFORM_ID);
    readonly #injector = inject(Injector);
    readonly #tokenState = inject(TokenState);
    private readonly _url = environment.socketUrl;
    private readonly _ev$ = new Subject<unknown>();
    private _conn: WebSocket;

    /**
     * socket もトークンを求める（ゲストは backend が作る匿名セッションのトークン）。
     * まだ取れていなければ（backend の 503 など）、取れたときにつなぐ。
     * 取れているときはその場でつなぎ、待つ側（toObservable）は取れていないときだけ使う。
     */
    connect(): void {
        if (!isPlatformBrowser(this.#platformId)) return;
        const current = this.#tokenState.accessToken();
        if (current) {
            this.#open(current);
            return;
        }
        toObservable(this.#tokenState.accessToken, { injector: this.#injector })
            .pipe(
                filter((token): token is string => !!token),
                take(1),
            )
            .subscribe((token) => this.#open(token));
    }

    #open(token: string): void {
        this._conn = new WebSocket(`${this._url}?token=${token}`);
        this._conn.onmessage = (ev: MessageEvent<unknown>) => {
            this._ev$.next(ev);
        };
        this.#logger.log('SocketService: Connected to WebSocket server');
    }

    disconnect(): void {
        if (!this._conn) return;
        this._conn.close();
        this.#logger.log('SocketService: Disconnected to WebSocket server');
    }

    on(): Observable<unknown> {
        return this._ev$.asObservable();
    }
}
