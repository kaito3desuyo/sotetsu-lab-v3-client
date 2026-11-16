import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NGXLogger } from 'ngx-logger';
import { lastValueFrom, of } from 'rxjs';
import { TokenState } from 'src/app/global-states/token.state';
import { AuthService } from 'src/app/libs/auth/usecase/auth.service';
import { SocketService } from './socket.service';

class FakeWebSocket {
    static instances: FakeWebSocket[] = [];
    readyState = 0;
    close = jest.fn(() => {
        this.readyState = 3;
    });
    readonly #listeners = new Map<string, ((ev: unknown) => void)[]>();

    constructor(readonly url: string) {
        FakeWebSocket.instances.push(this);
    }

    addEventListener(type: string, fn: (ev: unknown) => void): void {
        this.#listeners.set(type, [...(this.#listeners.get(type) ?? []), fn]);
    }

    emit(type: string, ev: unknown = {}): void {
        this.#listeners.get(type)?.forEach((fn) => fn(ev));
    }

    /** サーバー側が開く */
    open(): void {
        this.readyState = 1;
        this.emit('open');
    }

    /** サーバー側・OS が閉じる */
    drop(): void {
        this.readyState = 3;
        this.emit('close');
    }
}

describe('SocketService', () => {
    let mockGetToken: jest.Mock;
    const originalWebSocket = globalThis.WebSocket;
    let visibility: DocumentVisibilityState;

    const instances = () => FakeWebSocket.instances;
    const last = () => instances()[instances().length - 1];

    beforeEach(() => {
        jest.useFakeTimers();
        FakeWebSocket.instances = [];
        visibility = 'visible';
        jest.spyOn(document, 'visibilityState', 'get').mockImplementation(
            () => visibility,
        );
        mockGetToken = jest.fn();
        globalThis.WebSocket = FakeWebSocket as unknown as typeof WebSocket;
        TestBed.configureTestingModule({
            providers: [
                { provide: AuthService, useValue: { getToken: mockGetToken } },
                { provide: NGXLogger, useValue: { log: jest.fn() } },
                { provide: PLATFORM_ID, useValue: 'browser' },
            ],
        });
    });

    afterEach(() => {
        TestBed.inject(SocketService).disconnect();
        globalThis.WebSocket = originalWebSocket;
        jest.restoreAllMocks();
        jest.useRealTimers();
    });

    const setToken = (accessToken: string | null, expiresAt = 9999999999) => {
        mockGetToken.mockReturnValueOnce(
            of({
                accessToken,
                tokenType: accessToken ? 'Bearer' : null,
                expiresAt: accessToken ? expiresAt : null,
            }),
        );
        return lastValueFrom(TestBed.inject(TokenState).fetch());
    };

    const setVisibility = (v: DocumentVisibilityState) => {
        visibility = v;
        document.dispatchEvent(new Event('visibilitychange'));
    };

    /** トークンありで connect し、最初の接続を開く */
    const connected = async () => {
        await setToken('t-1');
        const service = TestBed.inject(SocketService);
        service.connect();
        last().open();
        return service;
    };

    describe('connect', () => {
        it('トークンがあれば、そのトークンでつなぐ', async () => {
            await setToken('t-1');
            TestBed.inject(SocketService).connect();
            expect(instances()).toHaveLength(1);
            expect(instances()[0].url).toMatch(/\?token=t-1$/);
        });

        it('トークンが無ければつながず、取れたときにつなぐ', async () => {
            await setToken(null);
            TestBed.inject(SocketService).connect();
            expect(instances()).toHaveLength(0);

            await setToken('t-2');
            // toObservable は effect の後に出すので、反映させる
            TestBed.tick();
            expect(instances()).toHaveLength(1);
            expect(instances()[0].url).toMatch(/\?token=t-2$/);

            await setToken('t-3');
            TestBed.tick();
            expect(instances()).toHaveLength(1);
        });

        it('期限切れなら fetch してから、新しいトークンでつなぐ', async () => {
            await setToken('old', 1);
            mockGetToken.mockReturnValueOnce(
                of({
                    accessToken: 'new',
                    tokenType: 'Bearer',
                    expiresAt: 9999999999,
                }),
            );
            TestBed.inject(SocketService).connect();
            await jest.advanceTimersByTimeAsync(0);
            expect(mockGetToken).toHaveBeenCalledTimes(2);
            expect(instances()).toHaveLength(1);
            expect(instances()[0].url).toMatch(/\?token=new$/);
        });

        it('つなぎ直すときも、期限切れなら取り直した新しいトークンを使う', async () => {
            await setToken('t-1', Math.floor(Date.now() / 1000) + 3600);
            const service = TestBed.inject(SocketService);
            service.connect();
            last().open();
            // 期限（1 分前から切れ扱い）を過ぎるまで待つ間に切れる
            mockGetToken.mockReturnValueOnce(
                of({
                    accessToken: 'fresh',
                    tokenType: 'Bearer',
                    expiresAt: 9999999999,
                }),
            );
            jest.setSystemTime(Date.now() + 3600 * 1000);
            last().drop();
            await jest.advanceTimersByTimeAsync(1000);
            expect(instances()).toHaveLength(2);
            expect(instances()[1].url).toMatch(/\?token=fresh$/);
        });
    });

    describe('つなぎ直し', () => {
        it('閉じたら 1 秒後につなぎ直す', async () => {
            await connected();
            last().drop();
            await jest.advanceTimersByTimeAsync(999);
            expect(instances()).toHaveLength(1);
            await jest.advanceTimersByTimeAsync(1);
            expect(instances()).toHaveLength(2);
        });

        it('続けて閉じると 2 秒・4 秒…と延び、30 秒で止まり、つながったら 1 秒に戻る', async () => {
            await connected();
            const waits = [1, 2, 4, 8, 16, 30, 30];
            for (const [i, sec] of waits.entries()) {
                last().drop();
                await jest.advanceTimersByTimeAsync(sec * 1000 - 1);
                expect(instances()).toHaveLength(i + 1);
                await jest.advanceTimersByTimeAsync(1);
                expect(instances()).toHaveLength(i + 2);
            }
            last().open();
            last().drop();
            await jest.advanceTimersByTimeAsync(1000);
            expect(instances()).toHaveLength(waits.length + 2);
        });

        it('disconnect() のあとは閉じてもつなぎ直さない', async () => {
            const service = await connected();
            const conn = last();
            service.disconnect();
            expect(conn.close).toHaveBeenCalled();
            conn.drop();
            await jest.advanceTimersByTimeAsync(60_000);
            expect(instances()).toHaveLength(1);
        });

        it('待っている間に disconnect() したら、つなぎ直さない', async () => {
            const service = await connected();
            last().drop();
            service.disconnect();
            await jest.advanceTimersByTimeAsync(60_000);
            expect(instances()).toHaveLength(1);
        });

        it('隠れている間に閉じたらタイマーを置かず、見えるようになったらすぐつなぐ', async () => {
            await connected();
            setVisibility('hidden');
            const timers = jest.getTimerCount();
            last().drop();
            expect(jest.getTimerCount()).toBe(timers);
            await jest.advanceTimersByTimeAsync(10_000);
            expect(instances()).toHaveLength(1);

            setVisibility('visible');
            expect(instances()).toHaveLength(2);
        });

        it('見えるようになったとき、待ちのタイマーは捨てて、待ち時間を 1 秒に戻す', async () => {
            await connected();
            // 待ち時間を 8 秒まで延ばしておく
            for (const sec of [1, 2, 4]) {
                last().drop();
                await jest.advanceTimersByTimeAsync(sec * 1000);
            }
            last().drop();
            setVisibility('hidden');
            setVisibility('visible');
            const count = instances().length;
            const timers = jest.getTimerCount();
            last().drop();
            expect(jest.getTimerCount()).toBe(timers + 1);
            await jest.advanceTimersByTimeAsync(1000);
            expect(instances()).toHaveLength(count + 1);
        });

        it('online で、閉じていればすぐつなぐ', async () => {
            await connected();
            last().drop();
            window.dispatchEvent(new Event('online'));
            expect(instances()).toHaveLength(2);
            // 待ちのタイマーは捨てている
            await jest.advanceTimersByTimeAsync(60_000);
            expect(instances()).toHaveLength(2);
        });

        it('online でも、開いていればつなぎ直さない', async () => {
            await connected();
            window.dispatchEvent(new Event('online'));
            expect(instances()).toHaveLength(1);
        });

        it('disconnect() のあとは、見えるようになっても online でもつながない', async () => {
            const service = await connected();
            service.disconnect();
            setVisibility('hidden');
            setVisibility('visible');
            window.dispatchEvent(new Event('online'));
            expect(instances()).toHaveLength(1);
        });
    });

    describe('resync', () => {
        const collect = (service: SocketService) => {
            const calls: number[] = [];
            service.resync().subscribe(() => calls.push(Date.now()));
            return calls;
        };

        it('最初の接続では流れない', async () => {
            await setToken('t-1');
            const service = TestBed.inject(SocketService);
            const calls = collect(service);
            service.connect();
            last().open();
            expect(calls).toHaveLength(0);
        });

        it('開いていた接続が切れたら、すぐのつなぎ直しでも流れる', async () => {
            const service = await connected();
            const calls = collect(service);
            last().drop();
            await jest.advanceTimersByTimeAsync(1000);
            expect(instances()).toHaveLength(2);
            expect(calls).toHaveLength(0);
            last().open();
            expect(calls).toHaveLength(1);
        });

        it('つなぎ直しが失敗し続けても、つながったときに 1 回だけ流れる', async () => {
            const service = await connected();
            const calls = collect(service);
            last().drop();
            for (const sec of [1, 2]) {
                await jest.advanceTimersByTimeAsync(sec * 1000);
                last().drop();
            }
            await jest.advanceTimersByTimeAsync(4000);
            last().open();
            expect(calls).toHaveLength(1);
        });

        it('一度も開かずに失敗した最初の接続のあとは流れない', async () => {
            await setToken('t-1');
            const service = TestBed.inject(SocketService);
            const calls = collect(service);
            service.connect();
            last().drop();
            await jest.advanceTimersByTimeAsync(1000);
            last().open();
            expect(calls).toHaveLength(0);
        });

        it('開いたまま 60 秒以上隠れて戻ると流れる。59 秒なら流れない', async () => {
            const service = await connected();
            const calls = collect(service);
            setVisibility('hidden');
            await jest.advanceTimersByTimeAsync(59_000);
            setVisibility('visible');
            expect(calls).toHaveLength(0);

            setVisibility('hidden');
            await jest.advanceTimersByTimeAsync(60_000);
            setVisibility('visible');
            expect(calls).toHaveLength(1);
        });

        it('隠れている間に切れていたら、戻った時点では流さず、つながったときに 1 回流す', async () => {
            const service = await connected();
            const calls = collect(service);
            setVisibility('hidden');
            last().drop();
            await jest.advanceTimersByTimeAsync(60_000);
            setVisibility('visible');
            expect(instances()).toHaveLength(2);
            expect(calls).toHaveLength(0);
            last().open();
            expect(calls).toHaveLength(1);
        });
    });
});
