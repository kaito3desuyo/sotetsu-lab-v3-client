import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { BehaviorSubject, Subject } from 'rxjs';

import { AppUpdateService } from './core/services/app-update.service';
import { GoogleAnalyticsService } from './core/services/google-analytics.service';
import { NotificationService } from './core/services/notification.service';
import { SocketService } from './core/services/socket.service';
import { UserStateQuery } from './global-states/user.state';
import {
    QueryInvalidationTag,
    QueryInvalidator,
} from './core/query-cache/query-invalidator';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
    let socketMessages: Subject<unknown>;
    let isLoggedIn$: BehaviorSubject<boolean>;
    let role$: BehaviorSubject<string | null>;
    let setUserProperties: jest.Mock;
    let sendEvent: jest.Mock;

    beforeEach(async () => {
        socketMessages = new Subject<unknown>();
        isLoggedIn$ = new BehaviorSubject<boolean>(false);
        role$ = new BehaviorSubject<string | null>(null);
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
                ]),
                { provide: AppUpdateService, useValue: {} },
                {
                    provide: GoogleAnalyticsService,
                    useValue: {
                        sendPageView: () => {},
                        setUserProperties,
                        sendEvent,
                    },
                },
                { provide: NotificationService, useValue: { open: () => {} } },
                {
                    provide: UserStateQuery,
                    useValue: { isLoggedIn$, role$ },
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

    it("他人の目撃投稿がソケットで届いたら、このタブで 'sighting' を流す", () => {
        const tags: QueryInvalidationTag[] = [];
        TestBed.inject(QueryInvalidator).invalidated$.subscribe((t) =>
            tags.push(t),
        );
        TestBed.createComponent(AppComponent);

        socketMessages.next(new MessageEvent('message', { data: '{}' }));

        expect(tags).toEqual(['sighting']);
    });

    it('ログインの状態と役割を GA のユーザープロパティに載せ、変わったら載せ直す', () => {
        TestBed.createComponent(AppComponent);

        expect(setUserProperties).toHaveBeenLastCalledWith({
            loggedIn: false,
            role: null,
        });

        isLoggedIn$.next(true);
        role$.next('editor');

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
});
