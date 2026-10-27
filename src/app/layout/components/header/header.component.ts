import { FetchError } from 'src/app/core/classes/custom-error';
import {
    ChangeDetectionStrategy,
    Component,
    inject,
    input,
    output,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { afterFirstRender } from 'src/app/core/ssr/first-render';
import { tryCatchAsync } from 'src/app/core/utils/error-handling';
import { safeReturnTo } from 'src/app/core/utils/return-to';
import { TokenState } from 'src/app/global-states/token.state';
import { UserState } from 'src/app/global-states/user.state';
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
    readonly #tokenState = inject(TokenState);
    readonly #userState = inject(UserState);

    /** サーバーと、それを引き継ぐ最初の描画はゲストの形にする（spec 5.3。CDN で別の人に配られるため） */
    readonly isLoggedIn = afterFirstRender(this.#userState.isLoggedIn, false);
    readonly displayName = this.#userState.displayName;

    /**
     * 現在ページ名。指定時はツールバーにページ名を表示する（モック全ページの
     * トップバー準拠）。空のとき（ホーム等）は従来どおり「Sotetsu Lab.」。
     */
    readonly pageTitle = input<string>('');

    clickButton = output<void>();

    /**
     * ログイン・登録のページから別の側へ移るときは、そのページが持つ return_to を引き継ぐ
     * （今の URL をそのまま渡すと safeReturnTo が '/' に潰してしまう）。
     */
    #returnTo(): string {
        const url = this.#router.url;
        const path = url.split(/[?#]/)[0];
        if (path === '/login' || path === '/register') {
            return safeReturnTo(
                this.#router.parseUrl(url).queryParams['return_to'],
            );
        }
        return safeReturnTo(url);
    }

    onClickRegister(): void {
        void this.#router.navigate(['/register'], {
            queryParams: { return_to: this.#returnTo() },
        });
    }

    onClickLogin(): void {
        void this.#router.navigate(['/login'], {
            queryParams: { return_to: this.#returnTo() },
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

        await tryCatchAsync(this.#tokenState.fetch());
        await tryCatchAsync(this.#userState.fetch());

        this.#snackBar.open('ログアウトしました', '閉じる', {
            duration: 3000,
        });
    }
}
