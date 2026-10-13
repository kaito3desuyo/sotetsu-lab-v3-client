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

    it('ログインしていなければ役割は guest にする', () => {
        service.setUserProperties({ loggedIn: false, role: null });

        expect(gtagMock).toHaveBeenCalledWith('set', 'user_properties', {
            logged_in: 'false',
            user_role: 'guest',
        });
    });
});
