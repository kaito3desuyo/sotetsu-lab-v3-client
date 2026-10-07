import { HttpErrorResponse } from '@angular/common/http';
import {
    ChangeDetectionStrategy,
    Component,
    inject,
    input,
    output,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { tryCatchAsync } from 'src/app/core/utils/error-handling';
import { TokenStateStore } from 'src/app/global-states/token.state';
import {
    UserStateQuery,
    UserStateStore,
} from 'src/app/global-states/user.state';
import { AuthService } from 'src/app/libs/auth/usecase/auth.service';
import { LoginDialogComponent } from '../login-dialog/login-dialog.component';
import { RegisterDialogComponent } from '../register-dialog/register-dialog.component';

@Component({
    selector: 'app-header',
    templateUrl: './header.component.html',
    styleUrls: ['./header.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatButtonModule,
        MatIconModule,
        MatMenuModule,
        MatDialogModule,
        MatSnackBarModule,
    ],
})
export class HeaderComponent {
    #dialog = inject(MatDialog);
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
        this.#dialog.open(RegisterDialogComponent, {
            width: '360px',
            maxWidth: '100vw',
            autoFocus: 'dialog',
            disableClose: true,
        });
    }

    onClickLogin(): void {
        this.#dialog.open(LoginDialogComponent, {
            width: '360px',
            maxWidth: '100vw',
            autoFocus: 'dialog',
            disableClose: true,
        });
    }

    async onClickLogout(): Promise<void> {
        const result = await tryCatchAsync(
            this.#authService.logout(),
            (e) => e as HttpErrorResponse,
        );

        if (result.isFailure()) {
            console.error('Logout failed:', result.error.error);

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
