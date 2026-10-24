import { HttpRequest } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { isTransferableRequest } from './transfer-cache-filter';

describe('isTransferableRequest', () => {
    it('API の /v3/ の GET は引き継ぐ', () => {
        const req = new HttpRequest('GET', `${environment.apiUrl}/v3/stations`);

        expect(isTransferableRequest(req)).toBe(true);
    });

    it('BFF の /api/ は引き継がない', () => {
        const req = new HttpRequest(
            'GET',
            `${environment.apiUrl}/api/user/profile`,
        );

        expect(isTransferableRequest(req)).toBe(false);
    });

    it('別オリジンは引き継がない', () => {
        const req = new HttpRequest(
            'GET',
            'https://v3.sotetsu-lab.com/api/auth/token',
        );

        expect(isTransferableRequest(req)).toBe(false);
    });

    it('末尾の / が違うパスは前方一致させない', () => {
        const req = new HttpRequest('GET', `${environment.apiUrl}/v3x/`);

        expect(isTransferableRequest(req)).toBe(false);
    });

    it.each(['reload', 'no-store', 'no-cache'] as const)(
        '書いた後に取り直す cache: %s の要求は引き継がない',
        (cache) => {
            const req = new HttpRequest(
                'GET',
                `${environment.apiUrl}/v3/stations`,
                { cache },
            );

            expect(isTransferableRequest(req)).toBe(false);
        },
    );
});
