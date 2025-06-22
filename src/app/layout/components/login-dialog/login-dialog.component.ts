import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import {
    ChangeDetectionStrategy,
    Component,
    inject,
    signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { tryCatchAsync } from 'src/app/core/utils/error-handling';
import { TokenStateStore } from 'src/app/global-states/token.state';
import { UserStateStore } from 'src/app/global-states/user.state';
import { AuthService } from 'src/app/libs/auth/usecase/auth.service';

@Component({
    selector: 'app-login-dialog',
    templateUrl: './login-dialog.component.html',
    styleUrl: './login-dialog.component.scss',
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
export class LoginDialogComponent {
    readonly #fb = inject(FormBuilder);
    readonly #http = inject(HttpClient);
    readonly #snackBar = inject(MatSnackBar);
    readonly #authService = inject(AuthService);
    readonly #tokenStateStore = inject(TokenStateStore);
    readonly #userStateStore = inject(UserStateStore);

    readonly form = this.#fb.group({
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
    });
    readonly passwordVisible = signal<boolean>(false);
    readonly submitting = signal<boolean>(false);

    constructor(public dialogRef: MatDialogRef<LoginDialogComponent>) {}

    onClickClose() {
        this.dialogRef.close();
    }

    async onClickSubmit() {
        const { username, password } = this.form.value;

        this.submitting.set(true);

        const result = await tryCatchAsync<void, HttpErrorResponse>(
            this.#authService.login({
                username,
                password,
            }),
        );

        if (result.isFailure()) {
            console.error('Login failed:', result.error.error);

            this.#snackBar.open('ログインに失敗しました', '閉じる', {
                duration: 3000,
            });

            this.submitting.set(false);

            return;
        }

        await tryCatchAsync(this.#tokenStateStore.fetch());
        await tryCatchAsync(this.#userStateStore.fetch());

        this.#snackBar.open('ログインしました', '閉じる', {
            duration: 3000,
        });

        this.dialogRef.close();
    }

    togglePasswordVisibility(): void {
        this.passwordVisible.update((visible) => !visible);
    }
}
