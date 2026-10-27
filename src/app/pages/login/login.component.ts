import {
    ChangeDetectionStrategy,
    Component,
    inject,
    signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FetchError } from 'src/app/core/classes/custom-error';
import { tryCatchAsync } from 'src/app/core/utils/error-handling';
import { safeReturnTo } from 'src/app/core/utils/return-to';
import { TokenState } from 'src/app/global-states/token.state';
import { UserState } from 'src/app/global-states/user.state';
import { AuthService } from 'src/app/libs/auth/usecase/auth.service';

@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ReactiveFormsModule,
        RouterLink,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
        MatSnackBarModule,
    ],
})
export class LoginComponent {
    readonly #fb = inject(FormBuilder);
    readonly #snackBar = inject(MatSnackBar);
    readonly #router = inject(Router);
    readonly #authService = inject(AuthService);
    readonly #tokenState = inject(TokenState);
    readonly #userState = inject(UserState);
    readonly #returnTo = safeReturnTo(
        inject(ActivatedRoute).snapshot.queryParamMap.get('return_to'),
    );

    readonly returnToParam = this.#returnTo;
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

    constructor() {
        if (this.#userState.isLoggedIn()) {
            void this.#router.navigateByUrl(this.#returnTo);
        }
    }

    async onClickSubmit(): Promise<void> {
        const { username, password } = this.form.value;

        this.submitting.set(true);

        const result = await tryCatchAsync<void, FetchError>(
            this.#authService.login({
                username,
                password,
            }),
        );

        if (result.isFailure()) {
            console.error('Login failed:', result.error.body);

            this.#snackBar.open('ログインに失敗しました', '閉じる', {
                duration: 3000,
            });

            this.submitting.set(false);

            return;
        }

        try {
            await tryCatchAsync(this.#tokenState.fetch());
            await tryCatchAsync(this.#userState.fetch());

            this.#snackBar.open('ログインしました', '閉じる', {
                duration: 3000,
            });

            await this.#router.navigateByUrl(this.#returnTo);
        } finally {
            this.submitting.set(false);
        }
    }

    togglePasswordVisibility(): void {
        this.passwordVisible.update((visible) => !visible);
    }
}
