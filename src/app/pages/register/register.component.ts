import {
    ChangeDetectionStrategy,
    Component,
    inject,
    signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
    FormBuilder,
    ReactiveFormsModule,
    ValidatorFn,
    Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { omit } from 'es-toolkit';
import { take } from 'rxjs';
import { FetchError } from 'src/app/core/classes/custom-error';
import { tryCatchAsync } from 'src/app/core/utils/error-handling';
import { safeReturnTo } from 'src/app/core/utils/return-to';
import { UserStateQuery } from 'src/app/global-states/user.state';
import { UserService } from 'src/app/libs/user/usecase/user.service';

@Component({
    selector: 'app-register',
    templateUrl: './register.component.html',
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
export class RegisterComponent {
    readonly #fb = inject(FormBuilder);
    readonly #snackBar = inject(MatSnackBar);
    readonly #router = inject(Router);
    readonly #userService = inject(UserService);
    readonly #userStateQuery = inject(UserStateQuery);
    readonly #returnTo = safeReturnTo(
        inject(ActivatedRoute).snapshot.queryParamMap.get('return_to'),
    );
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
    readonly returnToParam = this.#returnTo;
    readonly passwordVisible = signal<boolean>(false);
    readonly confirmPasswordVisible = signal<boolean>(false);
    readonly submitting = signal<boolean>(false);

    constructor() {
        this.#userStateQuery.isLoggedIn$
            .pipe(take(1), takeUntilDestroyed())
            .subscribe((loggedIn) => {
                if (loggedIn) {
                    void this.#router.navigateByUrl(this.#returnTo);
                }
            });
    }

    async onClickSubmit(): Promise<void> {
        const { username, password } = this.form.value;

        this.submitting.set(true);

        const result = await tryCatchAsync<void, FetchError>(
            this.#userService.registerUser({
                username,
                password,
            }),
        );

        if (result.isFailure()) {
            console.error('Registration failed:', result.error.body);

            if (result.error.message === 'User already exists.') {
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

        try {
            this.#snackBar.open('ユーザー登録が完了しました', '閉じる', {
                duration: 3000,
            });

            await this.#router.navigate(['/login'], {
                queryParams: { return_to: this.returnToParam },
            });
        } finally {
            this.submitting.set(false);
        }
    }

    togglePasswordVisibility(): void {
        this.passwordVisible.update((visible) => !visible);
    }

    toggleConfirmPasswordVisibility(): void {
        this.confirmPasswordVisible.update((visible) => !visible);
    }
}
