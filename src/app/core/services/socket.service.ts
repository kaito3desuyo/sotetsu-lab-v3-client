import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, Injector, PLATFORM_ID, inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { NGXLogger } from 'ngx-logger';
import { Observable, Subject, Subscription, filter, take } from 'rxjs';
import { TokenState } from 'src/app/global-states/token.state';
import { environment } from 'src/environments/environment';

/** WebSocket.readyState（テストで WebSocket を差し替えても読めるよう、定数は自前で持つ） */
const CONNECTING = 0;
const OPEN = 1;

/** つなぎ直しの待ち時間。1 秒から倍々で、上限 30 秒 */
const RETRY_MIN_MS = 1_000;
const RETRY_MAX_MS = 30_000;
/** これ以上隠れていたあとに見えるようになったときは、接続が開いて見えても止まっていた恐れがある */
const RESYNC_MIN_HIDDEN_MS = 60_000;

@Injectable({
    providedIn: 'root',
})
export class SocketService {
    readonly #logger = inject(NGXLogger);

    readonly #platformId = inject(PLATFORM_ID);
    readonly #document = inject(DOCUMENT);
    readonly #injector = inject(Injector);
    readonly #tokenState = inject(TokenState);
    private readonly _url = environment.socketUrl;
    private readonly _ev$ = new Subject<unknown>();
    readonly #resync$ = new Subject<void>();

    private _conn: WebSocket | undefined;
    /** つないでいたい間だけ true（connect() で立て、disconnect() で下ろす） */
    #wanted = false;
    #retryTimer: ReturnType<typeof setTimeout> | undefined;
    #retryDelay = RETRY_MIN_MS;
    /** トークンの取り直し・取得待ちの購読 */
    #pending: Subscription | undefined;
    /** 開いていた接続が閉じた（その間の合図は届いていない）。次に開いたら取り直す */
    #missedWhileClosed = false;
    #hiddenAt: number | null = null;

    readonly #onVisibilityChange = (): void => {
        if (!this.#wanted) return;
        const now = Date.now();
        if (this.#document.visibilityState !== 'visible') {
            this.#hiddenAt ??= now;
            return;
        }
        const hiddenFor = this.#hiddenAt === null ? 0 : now - this.#hiddenAt;
        this.#hiddenAt = null;
        // 閉じていれば、つながったときに open で取り直す（先に取り直すと、つながるまでの合図を取り逃す）
        const open = this._conn?.readyState === OPEN;
        this.#reconnectNow();
        if (open && hiddenFor >= RESYNC_MIN_HIDDEN_MS) this.#resync$.next();
    };

    readonly #onOnline = (): void => {
        if (!this.#wanted) return;
        this.#reconnectNow();
    };

    /**
     * socket もトークンを求める（ゲストは backend が作る匿名セッションのトークン）。
     * まだ取れていなければ（backend の 503 など）、取れたときにつなぐ。
     * 切れても、つないでいたい間（disconnect() まで）はつなぎ直す。
     */
    connect(): void {
        if (!isPlatformBrowser(this.#platformId)) return;
        if (this.#wanted) return;
        this.#wanted = true;
        this.#retryDelay = RETRY_MIN_MS;
        this.#document.addEventListener(
            'visibilitychange',
            this.#onVisibilityChange,
        );
        this.#document.defaultView?.addEventListener('online', this.#onOnline);
        this.#start();
    }

    disconnect(): void {
        if (!this.#wanted) return;
        this.#wanted = false;
        this.#clearRetry();
        this.#pending?.unsubscribe();
        this.#pending = undefined;
        this.#document.removeEventListener(
            'visibilitychange',
            this.#onVisibilityChange,
        );
        this.#document.defaultView?.removeEventListener(
            'online',
            this.#onOnline,
        );
        const conn = this._conn;
        this._conn = undefined;
        this.#missedWhileClosed = false;
        this.#hiddenAt = null;
        if (conn) {
            conn.close();
            this.#logger.log('SocketService: Disconnected to WebSocket server');
        }
    }

    on(): Observable<unknown> {
        return this._ev$.asObservable();
    }

    /**
     * 合図を取り逃したかもしれないときに流れる。開いていた接続が切れたあとにつながったとき（切れていた長さによらない）と、
     * 60 秒以上隠れていたあとに戻って接続が開いたままのとき。受け取る側は、合図のときと同じく取り直す。最初の接続では流れない。
     */
    resync(): Observable<void> {
        return this.#resync$.asObservable();
    }

    #clearRetry(): void {
        if (this.#retryTimer === undefined) return;
        clearTimeout(this.#retryTimer);
        this.#retryTimer = undefined;
    }

    /** 接続が無いか閉じかけ・閉じていれば、待たずにつなぐ（待ち時間は 1 秒に戻す） */
    #reconnectNow(): void {
        const state = this._conn?.readyState;
        if (state === CONNECTING || state === OPEN) return;
        this.#clearRetry();
        this.#retryDelay = RETRY_MIN_MS;
        this.#start();
    }

    #start(): void {
        if (!this.#wanted) return;
        this.#clearRetry();
        const state = this._conn?.readyState;
        if (state === CONNECTING || state === OPEN) return;
        // トークンの取り直し・取得待ちの最中は、重ねて始めない
        if (this.#pending && !this.#pending.closed) return;

        const token = this.#tokenState.accessToken();
        if (token && !this.#tokenState.isExpired()) {
            this.#open(token);
            return;
        }
        if (token) {
            // socket の authorizer は期限も検証するので、古いトークンでは Deny になる
            this.#pending = this.#tokenState.fetch().subscribe(() => {
                const fresh = this.#tokenState.accessToken();
                if (!this.#wanted) return;
                if (fresh) this.#open(fresh);
                else this.#waitForToken();
            });
            return;
        }
        this.#waitForToken();
    }

    #waitForToken(): void {
        this.#pending?.unsubscribe();
        this.#pending = toObservable(this.#tokenState.accessToken, {
            injector: this.#injector,
        })
            .pipe(
                filter((token): token is string => !!token),
                take(1),
            )
            .subscribe((token) => {
                if (this.#wanted) this.#open(token);
            });
    }

    #open(token: string): void {
        const conn = new WebSocket(`${this._url}?token=${token}`);
        this._conn = conn;
        let opened = false;
        conn.addEventListener('message', (ev: MessageEvent<unknown>) => {
            this._ev$.next(ev);
        });
        conn.addEventListener('open', () => {
            if (this._conn !== conn) return;
            opened = true;
            this.#retryDelay = RETRY_MIN_MS;
            if (this.#missedWhileClosed) {
                this.#missedWhileClosed = false;
                this.#resync$.next();
            }
        });
        conn.addEventListener('close', () => {
            // disconnect() 済み・つなぎ直し済みの古い接続の close は読み捨てる
            if (this._conn !== conn || !this.#wanted) return;
            if (opened) this.#missedWhileClosed = true;
            this.#logger.log('SocketService: WebSocket closed');
            this.#scheduleRetry();
        });
        this.#logger.log('SocketService: Connected to WebSocket server');
    }

    #scheduleRetry(): void {
        // 隠れている間はタイマーを置かず、見えるようになったときにつなぐ
        if (this.#document.visibilityState !== 'visible') return;
        this.#clearRetry();
        const delay = this.#retryDelay;
        this.#retryDelay = Math.min(delay * 2, RETRY_MAX_MS);
        this.#retryTimer = setTimeout(() => {
            this.#retryTimer = undefined;
            this.#start();
        }, delay);
    }
}
