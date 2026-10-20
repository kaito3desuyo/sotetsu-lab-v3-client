import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NGXLogger } from 'ngx-logger';
import { lastValueFrom, of } from 'rxjs';
import { TokenStateStore } from 'src/app/global-states/token.state';
import { AuthService } from 'src/app/libs/auth/usecase/auth.service';
import { SocketService } from './socket.service';

describe('SocketService.connect', () => {
    let mockGetToken: jest.Mock;
    let webSocket: jest.Mock;
    const originalWebSocket = globalThis.WebSocket;

    beforeEach(() => {
        mockGetToken = jest.fn();
        webSocket = jest.fn().mockImplementation(() => ({}));
        globalThis.WebSocket = webSocket as unknown as typeof WebSocket;
        TestBed.configureTestingModule({
            providers: [
                { provide: AuthService, useValue: { getToken: mockGetToken } },
                { provide: NGXLogger, useValue: { log: jest.fn() } },
                { provide: PLATFORM_ID, useValue: 'browser' },
            ],
        });
    });

    afterEach(() => {
        globalThis.WebSocket = originalWebSocket;
    });

    const setToken = (accessToken: string | null) => {
        mockGetToken.mockReturnValueOnce(
            of({
                accessToken,
                tokenType: accessToken ? 'Bearer' : null,
                expiresAt: accessToken ? 9999999999 : null,
            }),
        );
        return lastValueFrom(TestBed.inject(TokenStateStore).fetch());
    };

    it('トークンがあれば、そのトークンでつなぐ', async () => {
        await setToken('t-1');
        TestBed.inject(SocketService).connect();
        expect(webSocket).toHaveBeenCalledTimes(1);
        expect(webSocket.mock.calls[0][0]).toMatch(/\?token=t-1$/);
    });

    it('トークンが無ければつながず、取れたときにつなぐ', async () => {
        await setToken(null);
        TestBed.inject(SocketService).connect();
        expect(webSocket).not.toHaveBeenCalled();

        await setToken('t-2');
        expect(webSocket).toHaveBeenCalledTimes(1);
        expect(webSocket.mock.calls[0][0]).toMatch(/\?token=t-2$/);

        await setToken('t-3');
        expect(webSocket).toHaveBeenCalledTimes(1);
    });
});
