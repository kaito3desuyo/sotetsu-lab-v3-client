import { ServerErrorHandler } from './server-error-handler';

describe('ServerErrorHandler', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('エラーを標準エラーに ERROR 付きで出す', () => {
        const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const error = new Error('x');

        new ServerErrorHandler().handleError(error);

        expect(spy).toHaveBeenCalledWith('ERROR', error);
    });
});
