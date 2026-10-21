import { TestBed } from '@angular/core/testing';
import { NGXLogger } from 'ngx-logger';
import { FetchError } from '../classes/custom-error';
import { ErrorHandlerService } from './error-handler.service';
import { GoogleAnalyticsService } from './google-analytics.service';

describe('ErrorHandlerService', () => {
    let sendEvent: jest.Mock;
    let service: ErrorHandlerService;

    beforeEach(() => {
        sendEvent = jest.fn();
        TestBed.configureTestingModule({
            providers: [
                { provide: NGXLogger, useValue: { error: () => {} } },
                { provide: GoogleAnalyticsService, useValue: { sendEvent } },
            ],
        });
        service = TestBed.inject(ErrorHandlerService);
    });

    it('エラーの名前とメッセージを app_error で GA に送る', () => {
        service.handleError(new FetchError(400, '編成が見つかりません'));

        expect(sendEvent).toHaveBeenCalledWith('app_error', {
            error_message: 'FetchError 400: 編成が見つかりません',
        });
    });

    it('HTTP の失敗はステータスと道筋つきで送る', () => {
        service.handleError(
            new FetchError(
                503,
                '止まっています',
                {},
                'https://api.example.com/v3/agencies',
            ),
        );

        expect(sendEvent).toHaveBeenCalledWith('app_error', {
            error_message: 'FetchError 503 /v3/agencies: 止まっています',
        });
    });

    it('同じエラーは 2 回目から送らない', () => {
        service.handleError(new Error('同じ'));
        service.handleError(new Error('同じ'));
        service.handleError(new Error('別'));

        expect(sendEvent.mock.calls).toEqual([
            ['app_error', { error_message: 'Error: 同じ' }],
            ['app_error', { error_message: 'Error: 別' }],
        ]);
    });

    it('100 文字までに切って送る', () => {
        service.handleError(new Error('あ'.repeat(150)));

        expect(sendEvent).toHaveBeenCalledWith('app_error', {
            error_message: `Error: ${'あ'.repeat(150)}`.slice(0, 100),
        });
    });
});
