import { FetchError } from 'src/app/core/classes/custom-error';
import {
    ChangeDetectionStrategy,
    Component,
    inject,
    input,
    output,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { tryCatchAsync } from 'src/app/core/utils/error-handling';
import { safeReturnTo } from 'src/app/core/utils/return-to';
import { TokenStateStore } from 'src/app/global-states/token.state';
import {
    UserStateQuery,
    UserStateStore,
} from 'src/app/global-states/user.state';
import { AuthService } from 'src/app/libs/auth/usecase/auth.service';

@Component({
    selector: 'app-header',
    templateUrl: './header.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatButtonModule, MatIconModule, MatMenuModule, MatSnackBarModule],
})
export class HeaderComponent {
    #router = inject(Router);
    #snackBar = inject(MatSnackBar);
    readonly #authService = inject(AuthService);
    readonly #tokenStateStore = inject(TokenStateStore);
    readonly #userStateStore = inject(UserStateStore);
    readonly #userStateQuery = inject(UserStateQuery);

    readonly isLoggedIn = toSignal(this.#userStateQuery.isLoggedIn$);
    readonly displayName = toSignal(this.#userStateQuery.displayName$);

    /**
     * 現在ページ名。指定時はツールバーにページ名を表示する（モック全ページの
     * トップバー準拠）。空のとき（ホーム等）は従来どおり「Sotetsu Lab.」。
     */
    readonly pageTitle = input<string>('');

    clickButton = output<void>();

    onClickRegister(): void {
        void this.#router.navigate(['/register'], {
            queryParams: { return_to: safeReturnTo(this.#router.url) },
        });
    }

    onClickLogin(): void {
        void this.#router.navigate(['/login'], {
            queryParams: { return_to: safeReturnTo(this.#router.url) },
        });
    }

    async onClickLogout(): Promise<void> {
        const result = await tryCatchAsync(
            this.#authService.logout(),
            (e) => e as FetchError,
        );

        if (result.isFailure()) {
            console.error('Logout failed:', result.error.body);

            this.#snackBar.open('ログアウトに失敗しました', '閉じる', {
                duration: 3000,
            });

            return;
        }

        await tryCatchAsync(this.#tokenStateStore.fetch());
        await tryCatchAsync(this.#userStateStore.fetch());

        this.#snackBar.open('ログアウトしました', '閉じる', {
            duration: 3000,
        });
    }
}
