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
import { moderationGuard } from './moderation.guard';

const URL = '/moderation';

describe('moderationGuard', () => {
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
            moderationGuard(
                {} as ActivatedRouteSnapshot,
                { url: URL } as RouterStateSnapshot,
            ),
        ) as Promise<boolean | UrlTree>;
    }

    it('ゲストは return_to 付きで /login へ送る', async () => {
        const result = await run(null);

        expect(decodeURIComponent(router.serializeUrl(result as UrlTree))).toBe(
            '/login?return_to=/moderation',
        );
        expect(notificationOpen).not.toHaveBeenCalled();
    });

    it('取得に失敗したら利用者は空のままで、ゲスト扱いで /login へ送る', async () => {
        const result = await run('editor', true);

        expect(TestBed.inject(UserState).userId()).toBeNull();
        expect(decodeURIComponent(router.serializeUrl(result as UrlTree))).toBe(
            '/login?return_to=/moderation',
        );
        expect(notificationOpen).not.toHaveBeenCalled();
    });

    it.each(['reporter', 'viewer'])(
        '%s は、案内を出して / へ送る',
        async (role) => {
            const result = await run(role);

            expect(router.serializeUrl(result as UrlTree)).toBe('/');
            expect(notificationOpen).toHaveBeenCalledWith(
                '投稿管理の権限がありません',
                'OK',
            );
        },
    );

    it.each(['editor', 'manager'])('%s は通す', async (role) => {
        const result = await run(role);

        expect(result).toBe(true);
        expect(notificationOpen).not.toHaveBeenCalled();
    });

    it('直接開いた直後でも、トークンと利用者を取ってから判定する', async () => {
        await run('editor');

        expect(tokenFetch).toHaveBeenCalledWith({ maxAgeMs: 5000 });
    });
});
