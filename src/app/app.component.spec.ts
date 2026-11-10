import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { patchState } from '@ngrx/signals';
import { unprotected } from '@ngrx/signals/testing';
import { of, Subject } from 'rxjs';

import { FetchError } from './core/classes/custom-error';
import {
    APP_LOCATION,
    AppUpdateService,
} from './core/services/app-update.service';
import { GoogleAnalyticsService } from './core/services/google-analytics.service';
import { NotificationService } from './core/services/notification.service';
import { SocketService } from './core/services/socket.service';
import { TokenState } from './global-states/token.state';
import { UserState } from './global-states/user.state';
import {
    QueryInvalidationTag,
    QueryInvalidator,
} from './core/query-cache/query-invalidator';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
    let socketMessages: Subject<unknown>;
    let setUserProperties: jest.Mock;
    let sendEvent: jest.Mock;
    let tokenFetch: jest.Mock;
    let assign: jest.Mock;
    let notify: jest.Mock;

    beforeEach(async () => {
        sessionStorage.clear();
        assign = jest.fn();
        notify = jest.fn();
        tokenFetch = jest.fn(() => of(undefined));
        socketMessages = new Subject<unknown>();
        setUserProperties = jest.fn();
        sendEvent = jest.fn();
        await TestBed.configureTestingModule({
            imports: [AppComponent],
            providers: [
                provideHttpClient(withXhr()),
                provideRouter([
                    {
                        path: 'broken',
                        canActivate: [
                            () => {
                                throw new Error('壊れた');
                            },
                        ],
                        children: [],
                    },
                    {
                        path: 'broken-http',
                        canActivate: [
                            () => {
                                throw new FetchError(
                                    503,
                                    '止まっています',
                                    {},
                                    'https://api.example.com/v3/agencies',
                                );
                            },
                        ],
                        children: [],
                    },
                    {
                        path: 'stale-chunk',
                        loadComponent: () =>
                            Promise.reject(
                                new TypeError(
                                    'Importing a module script failed.',
                                ),
                            ),
                    },
                ]),
                {
                    provide: APP_LOCATION,
                    useValue: { assign, reload: () => {} },
                },
                { provide: NotificationService, useValue: { open: notify } },
                { provide: AppUpdateService, useValue: {} },
                {
                    provide: TokenState,
                    useValue: { fetch: tokenFetch, isExpired: () => true },
                },
                {
                    provide: GoogleAnalyticsService,
                    useValue: {
                        sendPageView: () => {},
                        setUserProperties,
                        sendEvent,
                    },
                },
                {
                    provide: SocketService,
                    useValue: {
                        connect: () => {},
                        disconnect: () => {},
                        on: () => socketMessages.asObservable(),
                    },
                },
            ],
        })
            .overrideComponent(AppComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();
    });

    it('should create the app', () => {
        const fixture = TestBed.createComponent(AppComponent);
        const app = fixture.componentInstance;
        expect(app).toBeTruthy();
    });

    describe('ソケットの合図', () => {
        const signal = (data: string) =>
            socketMessages.next(new MessageEvent('message', { data }));

        const collectTags = () => {
            const tags: QueryInvalidationTag[] = [];
            TestBed.inject(QueryInvalidator).invalidated$.subscribe((t) =>
                tags.push(t),
            );
            TestBed.createComponent(AppComponent);
            return tags;
        };

        it("{type: 'sighting'} が届いたら 'sighting' を流す", () => {
            const tags = collectTags();

            signal('{"type":"sighting"}');

            expect(tags).toEqual(['sighting']);
        });

        it("{type: 'timetable'} が届いたら 'timetable' を流す", () => {
            const tags = collectTags();

            signal('{"type":"timetable"}');

            expect(tags).toEqual(['timetable']);
        });

        it('古い sendSighting の転送（{action}）では何も流さない', () => {
            const tags = collectTags();

            signal('{"action":"sendSighting"}');

            expect(tags).toEqual([]);
        });
    });

    it('ログインの状態と役割を GA のユーザープロパティに載せ、変わったら載せ直す', () => {
        const userState = TestBed.inject(UserState);
        TestBed.createComponent(AppComponent);

        expect(setUserProperties).toHaveBeenLastCalledWith({
            loggedIn: false,
            role: null,
        });

        patchState(unprotected(userState), { userId: 'u1', role: 'editor' });

        expect(setUserProperties).toHaveBeenLastCalledWith({
            loggedIn: true,
            role: 'editor',
        });
    });

    it('ページの読み込みに失敗したら page_load_error を理由つきで送る', async () => {
        TestBed.createComponent(AppComponent);

        await TestBed.inject(Router)
            .navigateByUrl('/broken')
            .catch(() => {});

        expect(sendEvent).toHaveBeenCalledWith('page_load_error', {
            error_message: 'Error: 壊れた',
        });
    });

    it('API の失敗で読み込めなければ、ステータスと道筋を送る', async () => {
        TestBed.createComponent(AppComponent);

        await TestBed.inject(Router)
            .navigateByUrl('/broken-http')
            .catch(() => {});

        expect(sendEvent).toHaveBeenCalledWith('page_load_error', {
            error_message: 'FetchError 503 /v3/agencies: 止まっています',
        });
    });

    describe('古い版の部品が読めないとき', () => {
        const navigate = () =>
            TestBed.inject(Router)
                .navigateByUrl('/stale-chunk')
                .catch(() => {});

        it('移ろうとした URL を丸ごと読み込み直す（理由は GA に送る）', async () => {
            TestBed.createComponent(AppComponent);

            await navigate();

            expect(assign).toHaveBeenCalledWith('/stale-chunk');
            expect(notify).not.toHaveBeenCalled();
            expect(sendEvent).toHaveBeenCalledWith('page_load_error', {
                error_message: 'TypeError: Importing a module script failed.',
            });
        });

        it('読み込み直してもまた読めなければ、回し続けずに失敗を知らせる', async () => {
            TestBed.createComponent(AppComponent);

            await navigate();
            await navigate();

            expect(assign).toHaveBeenCalledTimes(1);
            expect(notify).toHaveBeenCalledWith(
                'ページの読み込みに失敗しました',
                'OK',
            );
        });

        it('ほかの失敗では読み込み直さない', async () => {
            TestBed.createComponent(AppComponent);

            await TestBed.inject(Router)
                .navigateByUrl('/broken')
                .catch(() => {});

            expect(assign).not.toHaveBeenCalled();
            expect(notify).toHaveBeenCalled();
        });
    });

    it('期限が切れていても、時間で勝手にトークンを取り直さない（取り直しは送る直前と 401 のときに interceptor がする）', async () => {
        jest.useFakeTimers();
        try {
            TestBed.createComponent(AppComponent);

            await jest.advanceTimersByTimeAsync(60_000);

            expect(tokenFetch).not.toHaveBeenCalled();
        } finally {
            jest.useRealTimers();
        }
    });
});
