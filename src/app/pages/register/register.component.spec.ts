import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
    ActivatedRoute,
    convertToParamMap,
    provideRouter,
    Router,
} from '@angular/router';
import { of } from 'rxjs';
import { FetchError } from 'src/app/core/classes/custom-error';
import { UserStateQuery } from 'src/app/global-states/user.state';
import { UserService } from 'src/app/libs/user/usecase/user.service';
import { RegisterComponent } from './register.component';

describe('RegisterComponent', () => {
    let component: RegisterComponent;
    let userService: { registerUser: jest.Mock };
    let router: { navigate: jest.Mock; navigateByUrl: jest.Mock };
    let snackBar: { open: jest.Mock };

    function setup(options: { returnTo: string | null; loggedIn: boolean }) {
        userService = { registerUser: jest.fn() };
        router = {
            navigate: jest.fn().mockResolvedValue(true),
            navigateByUrl: jest.fn().mockResolvedValue(true),
        };
        snackBar = { open: jest.fn() };

        TestBed.configureTestingModule({
            imports: [RegisterComponent],
            providers: [
                { provide: UserService, useValue: userService },
                {
                    provide: UserStateQuery,
                    useValue: { isLoggedIn$: of(options.loggedIn) },
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
            .overrideComponent(RegisterComponent, {
                set: { template: '', imports: [] },
            })
            .overrideProvider(MatSnackBar, { useValue: snackBar });

        const fixture = TestBed.createComponent(RegisterComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    }

    const failWith = (message: string) =>
        userService.registerUser.mockRejectedValue(
            new FetchError(400, message, {}, null, { message }),
        );

    const fillValid = () =>
        component.form.patchValue({
            username: 'user_1',
            password: 'Passw0rd!',
            confirmPassword: 'Passw0rd!',
        });

    beforeEach(() => {
        jest.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('確認用とパスワードが違えば両方に印を付け、そろえば外す', () => {
        setup({ returnTo: '/', loggedIn: false });
        const { password, confirmPassword } = component.form.controls;

        component.form.patchValue({
            password: 'Passw0rd!',
            confirmPassword: 'Passw0rd?',
        });
        expect(password.hasError('passwordsNotMatch')).toBe(true);
        expect(confirmPassword.hasError('passwordsNotMatch')).toBe(true);

        component.form.patchValue({ confirmPassword: 'Passw0rd!' });
        expect(password.errors).toBeNull();
        expect(confirmPassword.errors).toBeNull();
    });

    it('そろえても他の誤りは残す', () => {
        setup({ returnTo: '/', loggedIn: false });
        const { password } = component.form.controls;

        component.form.patchValue({ password: 'short', confirmPassword: 'x' });
        component.form.patchValue({ confirmPassword: 'short' });

        expect(password.hasError('passwordsNotMatch')).toBe(false);
        expect(password.hasError('minlength')).toBe(true);
    });

    it('登録できたら知らせて、return_to を引き継いで /login へ送る', async () => {
        setup({ returnTo: '/operation/real-time', loggedIn: false });
        userService.registerUser.mockResolvedValue(undefined);
        fillValid();

        await component.onClickSubmit();

        expect(userService.registerUser).toHaveBeenCalledWith({
            username: 'user_1',
            password: 'Passw0rd!',
        });
        expect(snackBar.open).toHaveBeenCalledWith(
            'ユーザー登録が完了しました',
            '閉じる',
            { duration: 3000 },
        );
        expect(router.navigate).toHaveBeenCalledWith(['/login'], {
            queryParams: { return_to: '/operation/real-time' },
        });
    });

    it('登録後の画面移動が失敗しても、送信中を解く', async () => {
        setup({ returnTo: '/', loggedIn: false });
        userService.registerUser.mockResolvedValue(undefined);
        router.navigate.mockRejectedValue(new Error('navigation failed'));
        fillValid();

        await expect(component.onClickSubmit()).rejects.toThrow(
            'navigation failed',
        );

        expect(component.submitting()).toBe(false);
    });

    it('return_to が外の URL なら / を引き継ぐ', async () => {
        setup({ returnTo: '//evil.example', loggedIn: false });
        userService.registerUser.mockResolvedValue(undefined);
        fillValid();

        await component.onClickSubmit();

        expect(router.navigate).toHaveBeenCalledWith(['/login'], {
            queryParams: { return_to: '/' },
        });
    });

    it('ユーザー名が使われていたら、その旨を出して留まる', async () => {
        setup({ returnTo: '/', loggedIn: false });
        failWith('User already exists.');

        await component.onClickSubmit();

        expect(snackBar.open).toHaveBeenCalledWith(
            'ユーザー名が既に使用されています',
            '閉じる',
            { duration: 3000 },
        );
        expect(component.submitting()).toBe(false);
        expect(router.navigate).not.toHaveBeenCalled();
    });

    it('それ以外の失敗は、登録に失敗したと出して留まる', async () => {
        setup({ returnTo: '/', loggedIn: false });
        failWith('Internal server error');

        await component.onClickSubmit();

        expect(snackBar.open).toHaveBeenCalledWith(
            'ユーザー登録に失敗しました',
            '閉じる',
            { duration: 3000 },
        );
        expect(component.submitting()).toBe(false);
        expect(router.navigate).not.toHaveBeenCalled();
    });

    it('ログイン済みで開いたら、すぐ return_to に戻る', () => {
        setup({ returnTo: '/timetable', loggedIn: true });
        expect(router.navigateByUrl).toHaveBeenCalledWith('/timetable');
    });

    it('ログインしていなければ、開いただけでは戻らない', () => {
        setup({ returnTo: '/timetable', loggedIn: false });
        expect(router.navigateByUrl).not.toHaveBeenCalled();
    });

    it('登録ボタンの近くに、プライバシーポリシーと免責事項へのリンクを出す', () => {
        TestBed.configureTestingModule({
            imports: [RegisterComponent],
            providers: [
                provideRouter([]),
                { provide: UserService, useValue: { registerUser: jest.fn() } },
                {
                    provide: UserStateQuery,
                    useValue: { isLoggedIn$: of(false) },
                },
            ],
        });
        const fixture = TestBed.createComponent(RegisterComponent);
        fixture.detectChanges();
        const element = fixture.nativeElement as HTMLElement;

        expect(
            element
                .querySelector('a[href="/privacy-policy"]')
                ?.textContent?.trim(),
        ).toBe('プライバシーポリシー');
        expect(
            element.querySelector('a[href="/disclaimer"]')?.textContent?.trim(),
        ).toBe('免責事項');
    });
});
