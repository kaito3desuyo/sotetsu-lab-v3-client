import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';
import { FetchError } from 'src/app/core/classes/custom-error';
import { TokenStateStore } from 'src/app/global-states/token.state';
import { UserStateStore } from 'src/app/global-states/user.state';
import { AuthService } from 'src/app/libs/auth/usecase/auth.service';
import { LoginDialogComponent } from './login-dialog.component';

describe('LoginDialogComponent', () => {
    let component: LoginDialogComponent;
    let fixture: ComponentFixture<LoginDialogComponent>;
    let login: jest.Mock;
    let fetchToken: jest.Mock;
    let fetchUser: jest.Mock;
    let close: jest.Mock;
    let snackBarOpen: jest.Mock;

    beforeEach(async () => {
        login = jest.fn(() => of(undefined));
        fetchToken = jest.fn(() => of(undefined));
        fetchUser = jest.fn(() => of(undefined));
        close = jest.fn();
        snackBarOpen = jest.fn();
        jest.spyOn(console, 'error').mockImplementation(() => undefined);

        await TestBed.configureTestingModule({
            imports: [LoginDialogComponent],
            providers: [
                { provide: MatDialogRef, useValue: { close } },
                { provide: AuthService, useValue: { login } },
                { provide: TokenStateStore, useValue: { fetch: fetchToken } },
                { provide: UserStateStore, useValue: { fetch: fetchUser } },
            ],
        })
            .overrideComponent(LoginDialogComponent, {
                set: { template: '', imports: [] },
            })
            .overrideProvider(MatSnackBar, {
                useValue: { open: snackBarOpen },
            })
            .compileComponents();

        fixture = TestBed.createComponent(LoginDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('ログインできたら、トークンとユーザーを取り直して閉じる', async () => {
        component.form.setValue({ username: 'user', password: 'Passw0rd!' });

        await component.onClickSubmit();

        expect(login).toHaveBeenCalledWith({
            username: 'user',
            password: 'Passw0rd!',
        });
        expect(fetchToken).toHaveBeenCalled();
        expect(fetchUser).toHaveBeenCalled();
        expect(snackBarOpen).toHaveBeenCalledWith(
            'ログインしました',
            '閉じる',
            {
                duration: 3000,
            },
        );
        expect(close).toHaveBeenCalled();
    });

    it('失敗したら知らせて、送信中を解き、閉じない', async () => {
        login.mockReturnValue(
            throwError(() => new FetchError(401, '不明なエラーが発生しました')),
        );

        await component.onClickSubmit();

        expect(snackBarOpen).toHaveBeenCalledWith(
            'ログインに失敗しました',
            '閉じる',
            { duration: 3000 },
        );
        expect(component.submitting()).toBe(false);
        expect(fetchToken).not.toHaveBeenCalled();
        expect(close).not.toHaveBeenCalled();
    });

    it('パスワードの表示を切り替える', () => {
        component.togglePasswordVisibility();
        expect(component.passwordVisible()).toBe(true);

        component.togglePasswordVisibility();
        expect(component.passwordVisible()).toBe(false);
    });
});
