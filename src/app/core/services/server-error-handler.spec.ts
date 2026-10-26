import { TestBed } from '@angular/core/testing';
import { SsrResponse } from 'src/app/core/ssr/ssr-response';
import { ServerErrorHandler } from './server-error-handler';

describe('ServerErrorHandler', () => {
    let setCachePolicy: jest.Mock;

    beforeEach(() => {
        setCachePolicy = jest.fn();
        TestBed.configureTestingModule({
            providers: [
                ServerErrorHandler,
                { provide: SsrResponse, useValue: { setCachePolicy } },
            ],
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('エラーを標準エラーに ERROR 付きで出す', () => {
        const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const error = new Error('x');

        TestBed.inject(ServerErrorHandler).handleError(error);

        expect(spy).toHaveBeenCalledWith('ERROR', error);
    });

    it('エラーが起きたページは CDN に置かない', () => {
        jest.spyOn(console, 'error').mockImplementation(() => {});

        TestBed.inject(ServerErrorHandler).handleError(new Error('x'));

        expect(setCachePolicy).toHaveBeenCalledWith('no-store');
    });
});
