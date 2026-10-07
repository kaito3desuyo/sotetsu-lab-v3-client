import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { Subject } from 'rxjs';

import { AppUpdateService } from './core/services/app-update.service';
import { GoogleAnalyticsService } from './core/services/google-analytics.service';
import { SocketService } from './core/services/socket.service';
import {
    QueryInvalidationTag,
    QueryInvalidator,
} from './core/query-cache/query-invalidator';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
    let socketMessages: Subject<unknown>;

    beforeEach(async () => {
        socketMessages = new Subject<unknown>();
        await TestBed.configureTestingModule({
            imports: [AppComponent],
            providers: [
                provideHttpClient(withXhr()),
                provideRouter([]),
                { provide: AppUpdateService, useValue: {} },
                {
                    provide: GoogleAnalyticsService,
                    useValue: { sendPageView: () => {} },
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
});
