import { TestBed } from '@angular/core/testing';
import { NGXLogger } from 'ngx-logger';
import { GoogleAnalyticsService } from './google-analytics.service';

jest.mock('src/environments/environment', () => ({
    environment: { production: true },
}));

describe('GoogleAnalyticsService', () => {
    let gtagMock: jest.Mock;
    let service: GoogleAnalyticsService;

    beforeEach(() => {
        gtagMock = jest.fn();
        (globalThis as unknown as { gtag: jest.Mock }).gtag = gtagMock;

        TestBed.configureTestingModule({
            providers: [{ provide: NGXLogger, useValue: { log: () => {} } }],
        });
        service = TestBed.inject(GoogleAnalyticsService);
    });

    afterEach(() => {
        delete (globalThis as unknown as { gtag?: jest.Mock }).gtag;
    });

    it('ログイン中は役割をそのまま user_properties に載せる', () => {
        service.setUserProperties({ loggedIn: true, role: 'editor' });

        expect(gtagMock).toHaveBeenCalledWith('set', 'user_properties', {
            logged_in: 'true',
            user_role: 'editor',
        });
    });

    it('イベントを名前と値つきで送る', () => {
        service.sendEvent('sighting_submit_failure', {
            error_message: '編成が見つかりません',
        });

        expect(gtagMock).toHaveBeenCalledWith(
            'event',
            'sighting_submit_failure',
            { error_message: '編成が見つかりません' },
        );
    });

    describe('sendPageView', () => {
        type IdleGlobal = { requestIdleCallback?: unknown };
        const g = globalThis as unknown as IdleGlobal;

        afterEach(() => {
            delete g.requestIdleCallback;
            jest.useRealTimers();
        });

        it('requestIdleCallback があれば、暇になるまで送らず、timeout 2000 で予約する', () => {
            const idle = jest.fn();
            g.requestIdleCallback = idle;

            service.sendPageView('題名', 'timetable');

            expect(gtagMock).not.toHaveBeenCalled();
            expect(idle).toHaveBeenCalledWith(expect.any(Function), {
                timeout: 2000,
            });

            idle.mock.calls[0][0]();

            expect(gtagMock).toHaveBeenCalledTimes(1);
            expect(gtagMock).toHaveBeenCalledWith(
                'event',
                'page_view',
                expect.objectContaining({
                    page_title: '題名',
                    page_path: '/timetable',
                }),
            );
        });

        it('requestIdleCallback が無ければ setTimeout 0 で送る', () => {
            jest.useFakeTimers();
            delete g.requestIdleCallback;

            service.sendPageView('題名', '/timetable');

            expect(gtagMock).not.toHaveBeenCalled();
            jest.advanceTimersByTime(0);

            expect(gtagMock).toHaveBeenCalledWith('event', 'page_view', {
                page_title: '題名',
                page_location: location.href,
                page_path: '/timetable',
            });
        });

        it('page_location は呼んだ時点の URL で、暇になるまでに遷移しても変わらない', () => {
            const idle = jest.fn();
            g.requestIdleCallback = idle;
            window.history.pushState({}, '', '/before');

            service.sendPageView('題名', '/before');
            window.history.pushState({}, '', '/after');
            idle.mock.calls[0][0]();

            expect(gtagMock).toHaveBeenCalledWith(
                'event',
                'page_view',
                expect.objectContaining({
                    page_location: expect.stringMatching(/\/before$/),
                }),
            );
        });

        it('setUserProperties は page_view が暇を待つ間もその場で呼ばれ、順番が崩れない', () => {
            const idle = jest.fn();
            g.requestIdleCallback = idle;

            service.sendPageView('題名', '/timetable');
            service.setUserProperties({ loggedIn: true, role: 'editor' });
            idle.mock.calls[0][0]();

            expect(gtagMock.mock.calls.map((c) => c[1])).toEqual([
                'user_properties',
                'page_view',
            ]);
        });
    });

    it('ログインしていなければ役割は guest にする', () => {
        service.setUserProperties({ loggedIn: false, role: null });

        expect(gtagMock).toHaveBeenCalledWith('set', 'user_properties', {
            logged_in: 'false',
            user_role: 'guest',
        });
    });
});

describe('GoogleAnalyticsService（gtag が無い環境）', () => {
    beforeEach(() => {
        delete (globalThis as unknown as { gtag?: jest.Mock }).gtag;
        TestBed.configureTestingModule({
            providers: [{ provide: NGXLogger, useValue: { log: () => {} } }],
        });
    });

    it('本番でも gtag が無ければ何も送らず、投げない', () => {
        const ga = TestBed.inject(GoogleAnalyticsService);

        expect(() => ga.sendPageView('題名', '/timetable')).not.toThrow();
        expect(() => ga.sendEvent('x')).not.toThrow();
        expect(() =>
            ga.setUserProperties({ loggedIn: false, role: null }),
        ).not.toThrow();
    });
});
