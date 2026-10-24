import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { onCLS, onINP, onLCP } from 'web-vitals';
import { GoogleAnalyticsService } from '../services/google-analytics.service';
import { WebVitalsReporter } from './web-vitals-reporter';

jest.mock('web-vitals', () => ({
    onLCP: jest.fn(),
    onINP: jest.fn(),
    onCLS: jest.fn(),
}));

function setup(platformId: 'browser' | 'server') {
    TestBed.configureTestingModule({
        providers: [
            { provide: PLATFORM_ID, useValue: platformId },
            {
                provide: GoogleAnalyticsService,
                useValue: { sendEvent: jest.fn() },
            },
        ],
    });
    return TestBed.inject(WebVitalsReporter);
}

describe('WebVitalsReporter', () => {
    beforeEach(() => jest.clearAllMocks());

    it('サーバーでは測り始めない', () => {
        setup('server').start();

        expect(onLCP).not.toHaveBeenCalled();
        expect(onINP).not.toHaveBeenCalled();
        expect(onCLS).not.toHaveBeenCalled();
    });

    it('ブラウザでは LCP・INP・CLS を測り始める', () => {
        setup('browser').start();

        expect(onLCP).toHaveBeenCalledTimes(1);
        expect(onINP).toHaveBeenCalledTimes(1);
        expect(onCLS).toHaveBeenCalledTimes(1);
    });
});
