import { ErrorHandler } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { appConfig } from './app.config';
import { WebVitalsReporter } from './core/web-vitals/web-vitals-reporter';

describe('appConfig', () => {
    afterEach(() => {
        TestBed.resetTestingModule();
    });

    // zone.js が無いと、未処理の Promise 拒否や window の error は ErrorHandler に届かない。
    // provideBrowserGlobalErrorListeners() がその経路を戻す
    it('window の error が ErrorHandler.handleError に届く', () => {
        const handleError = jest.fn();
        TestBed.configureTestingModule({
            providers: [
                ...appConfig.providers,
                provideRouter([]),
                { provide: WebVitalsReporter, useValue: { start: jest.fn() } },
                { provide: ErrorHandler, useValue: { handleError } },
            ],
        });
        TestBed.inject(ErrorHandler);
        // jsdom は preventDefault されない error イベントを console.error に出す。出力を静かにするだけ
        const consoleError = jest.spyOn(console, 'error').mockImplementation();
        const error = new Error('x');

        window.dispatchEvent(new ErrorEvent('error', { error }));

        consoleError.mockRestore();

        expect(handleError).toHaveBeenCalledWith(error);
    });
});
