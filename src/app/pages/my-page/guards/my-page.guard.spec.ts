import { TestBed } from '@angular/core/testing';
import {
    ActivatedRouteSnapshot,
    provideRouter,
    Router,
    RouterStateSnapshot,
    UrlTree,
} from '@angular/router';
import { of, throwError } from 'rxjs';
import { NotificationService } from 'src/app/core/services/notification.service';
import { TokenState } from 'src/app/global-states/token.state';
import { UserState } from 'src/app/global-states/user.state';
import { UserService } from 'src/app/libs/user/usecase/user.service';
import { myPageGuard } from './my-page.guard';

const URL = '/my-page';

describe('myPageGuard', () => {
    let notificationOpen: jest.Mock;
    let tokenFetch: jest.Mock;
    let router: Router;

    /** role が null ならゲスト（profile が null）。profileError なら profile の取得が失敗する */
    function run(
        role: string | null,
        profileError = false,
    ): Promise<boolean | UrlTree> {
        notificationOpen = jest.fn();
        tokenFetch = jest.fn(() => of(undefined));
        TestBed.configureTestingModule({
            providers: [
                provideRouter([]),
                {
                    provide: NotificationService,
                    useValue: { open: notificationOpen },
                },
                { provide: TokenState, useValue: { fetch: tokenFetch } },
                {
                    provide: UserService,
                    useValue: {
                        getProfile: () =>
                            profileError
                                ? throwError(() => new Error('offline'))
                                : of(
                                      role
                                          ? {
                                                userId: 'u1',
                                                username: 'x',
                                                displayName: 'X',
                                                role,
                                            }
                                          : null,
                                  ),
                    },
                },
            ],
        });
        router = TestBed.inject(Router);
        return TestBed.runInInjectionContext(() =>
            myPageGuard(
                {} as ActivatedRouteSnapshot,
                { url: URL } as RouterStateSnapshot,
            ),
        ) as Promise<boolean | UrlTree>;
    }

    it.each(['reporter', 'editor', 'manager'])('%s は通す', async (role) => {
        const result = await run(role);

        expect(result).toBe(true);
        expect(notificationOpen).not.toHaveBeenCalled();
    });

    it('ゲストは /login?return_to=%2Fmy-page へ送る', async () => {
        const result = await run(null);

        expect(router.serializeUrl(result as UrlTree)).toBe(
            '/login?return_to=%2Fmy-page',
        );
        expect(notificationOpen).not.toHaveBeenCalled();
    });

    it('取得に失敗したら利用者は空のままで、ゲスト扱いで /login へ送る', async () => {
        const result = await run('reporter', true);

        expect(TestBed.inject(UserState).userId()).toBeNull();
        expect(router.serializeUrl(result as UrlTree)).toBe(
            '/login?return_to=%2Fmy-page',
        );
        expect(notificationOpen).not.toHaveBeenCalled();
    });

    it('viewer は / へ戻し、案内を出す', async () => {
        const result = await run('viewer');

        expect(router.serializeUrl(result as UrlTree)).toBe('/');
        expect(notificationOpen).toHaveBeenCalledWith(
            'マイページは投稿できるアカウントだけが使えます',
            'OK',
        );
    });

    it('直接開いた直後でも、トークンと利用者を取ってから判定する', async () => {
        await run('reporter');

        expect(tokenFetch).toHaveBeenCalledWith({ maxAgeMs: 5000 });
    });
});
