import { HttpErrorResponse } from '@angular/common/http';
import {
    ChangeDetectionStrategy,
    Component,
    inject,
    signal,
} from '@angular/core';
import {
    FormBuilder,
    ReactiveFormsModule,
    ValidatorFn,
    Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { omit } from 'es-toolkit';
import { tryCatchAsync } from 'src/app/core/utils/error-handling';
import { UserService } from 'src/app/libs/user/usecase/user.service';

@Component({
    selector: 'app-register-dialog',
    templateUrl: './register-dialog.component.html',
    styleUrl: './register-dialog.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
        MatSnackBarModule,
    ],
})
export class RegisterDialogComponent {
    readonly #fb = inject(FormBuilder);
    readonly #snackBar = inject(MatSnackBar);
    readonly #userService = inject(UserService);
    readonly #passwordsNotMatchValidator: ValidatorFn = (formGroup) => {
        const passwordControl = formGroup.get('password');
        const confirmPasswordControl = formGroup.get('confirmPassword');

        const password = formGroup.get('password')?.value;
        const confirmPassword = formGroup.get('confirmPassword')?.value;

        if (password !== confirmPassword) {
            passwordControl.setErrors({
                ...(passwordControl.errors ?? {}),
                passwordsNotMatch: true,
            });
            confirmPasswordControl.setErrors({
                ...(confirmPasswordControl.errors ?? {}),
                passwordsNotMatch: true,
            });
        } else {
            passwordControl.setErrors(
                Object.keys(
                    omit(passwordControl.errors ?? {}, ['passwordsNotMatch']),
                ).length === 0
                    ? null
                    : omit(passwordControl.errors ?? {}, ['passwordsNotMatch']),
            );
            confirmPasswordControl.setErrors(
                Object.keys(
                    omit(confirmPasswordControl.errors ?? {}, [
                        'passwordsNotMatch',
                    ]),
                ).length === 0
                    ? null
                    : omit(confirmPasswordControl.errors ?? {}, [
                          'passwordsNotMatch',
                      ]),
            );
        }

        return null;
    };

    readonly form = this.#fb.group(
        {
            username: this.#fb.control('', [
                Validators.required,
                Validators.minLength(4),
                Validators.maxLength(20),
                Validators.pattern(/^[a-zA-Z0-9_-]+$/),
            ]),
            password: this.#fb.control('', [
                Validators.required,
                Validators.minLength(8),
                Validators.maxLength(128),
                Validators.pattern(
                    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).+$/,
                ),
            ]),
            confirmPassword: this.#fb.control('', [
                Validators.required,
                Validators.minLength(8),
                Validators.maxLength(128),
                Validators.pattern(
                    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).+$/,
                ),
            ]),
        },
        {
            validators: [this.#passwordsNotMatchValidator],
        },
    );
    readonly passwordVisible = signal<boolean>(false);
    readonly confirmPasswordVisible = signal<boolean>(false);
    readonly submitting = signal<boolean>(false);

    constructor(public dialogRef: MatDialogRef<RegisterDialogComponent>) {}

    onClickClose(): void {
        this.dialogRef.close();
    }

    async onClickSubmit(): Promise<void> {
        const { username, password } = this.form.value;

        this.submitting.set(true);

        const result = await tryCatchAsync<void, HttpErrorResponse>(
            this.#userService.registerUser({
                username,
                password,
            }),
        );

        if (result.isFailure()) {
            console.error('Registration failed:', result.error.error);

            if (result.error.error.message === 'User already exists.') {
                this.#snackBar.open(
                    'ユーザー名が既に使用されています',
                    '閉じる',
                    {
                        duration: 3000,
                    },
                );

                this.submitting.set(false);

                return;
            }

            this.#snackBar.open('ユーザー登録に失敗しました', '閉じる', {
                duration: 3000,
            });

            this.submitting.set(false);

            return;
        }

        this.#snackBar.open('ユーザー登録が完了しました', '閉じる', {
            duration: 3000,
        });

        this.dialogRef.close();
    }

    togglePasswordVisibility(): void {
        this.passwordVisible.update((visible) => !visible);
    }

    toggleConfirmPasswordVisibility(): void {
        this.confirmPasswordVisible.update((visible) => !visible);
    }
}
