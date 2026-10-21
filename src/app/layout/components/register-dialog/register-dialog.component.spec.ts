import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';
import { FetchError } from 'src/app/core/classes/custom-error';
import { UserService } from 'src/app/libs/user/usecase/user.service';
import { RegisterDialogComponent } from './register-dialog.component';

describe('RegisterDialogComponent', () => {
    let component: RegisterDialogComponent;
    let fixture: ComponentFixture<RegisterDialogComponent>;
    let registerUser: jest.Mock;
    let close: jest.Mock;
    let snackBarOpen: jest.Mock;

    beforeEach(async () => {
        registerUser = jest.fn(() => of(undefined));
        close = jest.fn();
        snackBarOpen = jest.fn();
        jest.spyOn(console, 'error').mockImplementation(() => undefined);

        await TestBed.configureTestingModule({
            imports: [RegisterDialogComponent],
            providers: [
                { provide: MatDialogRef, useValue: { close } },
                { provide: UserService, useValue: { registerUser } },
            ],
        })
            .overrideComponent(RegisterDialogComponent, {
                set: { template: '', imports: [] },
            })
            .overrideProvider(MatSnackBar, {
                useValue: { open: snackBarOpen },
            })
            .compileComponents();

        fixture = TestBed.createComponent(RegisterDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    const failWith = (message: string) =>
        registerUser.mockReturnValue(
            throwError(
                () => new FetchError(400, message, {}, null, { message }),
            ),
        );

    it('確認用とパスワードが違えば両方に印を付け、そろえば外す', () => {
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
        const { password } = component.form.controls;

        component.form.patchValue({ password: 'short', confirmPassword: 'x' });
        component.form.patchValue({ confirmPassword: 'short' });

        expect(password.hasError('passwordsNotMatch')).toBe(false);
        expect(password.hasError('minlength')).toBe(true);
    });

    it('登録できたら知らせて閉じる', async () => {
        component.form.patchValue({
            username: 'user',
            password: 'Passw0rd!',
            confirmPassword: 'Passw0rd!',
        });

        await component.onClickSubmit();

        expect(registerUser).toHaveBeenCalledWith({
            username: 'user',
            password: 'Passw0rd!',
        });
        expect(snackBarOpen).toHaveBeenCalledWith(
            'ユーザー登録が完了しました',
            '閉じる',
            { duration: 3000 },
        );
        expect(close).toHaveBeenCalled();
    });

    it('ユーザー名が使われていたら、その旨を出す', async () => {
        failWith('User already exists.');

        await component.onClickSubmit();

        expect(snackBarOpen).toHaveBeenCalledWith(
            'ユーザー名が既に使用されています',
            '閉じる',
            { duration: 3000 },
        );
        expect(component.submitting()).toBe(false);
        expect(close).not.toHaveBeenCalled();
    });

    it('それ以外の失敗は、登録に失敗したと出す', async () => {
        failWith('Internal server error');

        await component.onClickSubmit();

        expect(snackBarOpen).toHaveBeenCalledWith(
            'ユーザー登録に失敗しました',
            '閉じる',
            { duration: 3000 },
        );
        expect(component.submitting()).toBe(false);
        expect(close).not.toHaveBeenCalled();
    });
});
