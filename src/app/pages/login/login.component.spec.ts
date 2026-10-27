import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { FetchError } from 'src/app/core/classes/custom-error';
import { TokenState } from 'src/app/global-states/token.state';
import { UserState } from 'src/app/global-states/user.state';
import { AuthService } from 'src/app/libs/auth/usecase/auth.service';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
    let component: LoginComponent;
    let authService: { login: jest.Mock };
    let tokenStateStore: { fetch: jest.Mock };
    let userStateStore: { fetch: jest.Mock };
    let router: { navigateByUrl: jest.Mock };
    let snackBar: { open: jest.Mock };

    function setup(options: { returnTo: string | null; loggedIn: boolean }) {
        authService = { login: jest.fn() };
        tokenStateStore = { fetch: jest.fn().mockResolvedValue(undefined) };
        userStateStore = { fetch: jest.fn().mockResolvedValue(undefined) };
        router = { navigateByUrl: jest.fn().mockResolvedValue(true) };
        snackBar = { open: jest.fn() };

        TestBed.configureTestingModule({
            imports: [LoginComponent],
            providers: [
                { provide: AuthService, useValue: authService },
                { provide: TokenState, useValue: tokenStateStore },
                {
                    provide: UserState,
                    useValue: {
                        ...userStateStore,
                        isLoggedIn: () => options.loggedIn,
                    },
                },
                { provide: Router, useValue: router },
                {
                    provide: ActivatedRoute,
                    useValue: {
                        snapshot: {
                            queryParamMap: convertToParamMap(
                                options.returnTo === null
                                    ? {}
                                    : { return_to: options.returnTo },
                            ),
                        },
                    },
                },
            ],
        })
            .overrideComponent(LoginComponent, {
                set: { template: '', imports: [] },
            })
            .overrideProvider(MatSnackBar, { useValue: snackBar });

        const fixture = TestBed.createComponent(LoginComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    }

    beforeEach(() => {
        jest.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('ログインに成功したら return_to に戻る', async () => {
        setup({ returnTo: '/operation/real-time', loggedIn: false });
        authService.login.mockResolvedValue(undefined);
        component.form.setValue({ username: 'user_1', password: 'Passw0rd!' });

        await component.onClickSubmit();

        expect(authService.login).toHaveBeenCalledWith({
            username: 'user_1',
            password: 'Passw0rd!',
        });
        expect(tokenStateStore.fetch).toHaveBeenCalled();
        expect(userStateStore.fetch).toHaveBeenCalled();
        expect(router.navigateByUrl).toHaveBeenCalledWith(
            '/operation/real-time',
        );
    });

    it('return_to が外の URL なら / に戻る', async () => {
        setup({ returnTo: '//evil.example', loggedIn: false });
        authService.login.mockResolvedValue(undefined);
        component.form.setValue({ username: 'user_1', password: 'Passw0rd!' });

        await component.onClickSubmit();

        expect(router.navigateByUrl).toHaveBeenCalledWith('/');
    });

    it('ログインに失敗したらページに留まり、知らせる', async () => {
        setup({ returnTo: '/', loggedIn: false });
        authService.login.mockRejectedValue(
            new FetchError(401, 'Unauthorized'),
        );
        component.form.setValue({ username: 'user_1', password: 'Passw0rd!' });

        await component.onClickSubmit();

        expect(router.navigateByUrl).not.toHaveBeenCalled();
        expect(snackBar.open).toHaveBeenCalledWith(
            'ログインに失敗しました',
            '閉じる',
            { duration: 3000 },
        );
        expect(component.submitting()).toBe(false);
        expect(tokenStateStore.fetch).not.toHaveBeenCalled();
    });

    it('ログイン後の画面移動が失敗しても、送信中を解く', async () => {
        setup({ returnTo: '/', loggedIn: false });
        authService.login.mockResolvedValue(undefined);
        router.navigateByUrl.mockRejectedValue(new Error('navigation failed'));
        component.form.setValue({ username: 'user_1', password: 'Passw0rd!' });

        await expect(component.onClickSubmit()).rejects.toThrow(
            'navigation failed',
        );

        expect(component.submitting()).toBe(false);
    });

    it('ログイン済みで開いたら、すぐ return_to に戻る', () => {
        setup({ returnTo: '/timetable', loggedIn: true });
        expect(router.navigateByUrl).toHaveBeenCalledWith('/timetable');
    });

    it('ログインしていなければ、開いただけでは戻らない', () => {
        setup({ returnTo: '/timetable', loggedIn: false });
        expect(router.navigateByUrl).not.toHaveBeenCalled();
    });

    it('return_to が無ければ / を新規登録へ引き継ぐ', () => {
        setup({ returnTo: null, loggedIn: false });
        expect(component.returnToParam).toBe('/');
    });

    it('パスワードの表示を切り替える', () => {
        setup({ returnTo: '/', loggedIn: false });

        component.togglePasswordVisibility();
        expect(component.passwordVisible()).toBe(true);

        component.togglePasswordVisibility();
        expect(component.passwordVisible()).toBe(false);
    });
});
