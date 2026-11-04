import {
    ChangeDetectionStrategy,
    Component,
    inject,
    input,
} from '@angular/core';
import { Router } from '@angular/router';
import { OperationNumberColorPipe } from 'src/app/core/pipes/operation-number-color.pipe';
import { safeReturnTo } from 'src/app/core/utils/return-to';
import { UserState } from 'src/app/global-states/user.state';
import { OperationPostDialogService } from 'src/app/shared/operation-post-dialog/operation-post-dialog.service';

/**
 * 目撃募集の帯。いま走っていて今日まだ目撃の無い運用を、運用群の色のチップで並べる。
 * 押すとその運用番号で投稿ダイアログを開く（ゲストはログインへ。viewer と 0 件は何も描かない）。
 */
@Component({
    selector: 'app-operation-real-time-sighting-call',
    templateUrl: './operation-real-time-sighting-call.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [OperationNumberColorPipe],
    // 何も描かないとき、ホストが main の flex の gap を取らないようにする（中の帯が item になる）
    host: { class: 'tw-contents' },
})
export class OperationRealTimeSightingCallComponent {
    readonly #router = inject(Router);
    readonly #postDialog = inject(OperationPostDialogService);
    readonly userState = inject(UserState);

    readonly operations = input.required<{ operationNumber: string }[]>();

    onClickChip(operationNumber: string): void {
        if (!this.userState.isLoggedIn()) {
            void this.#router.navigate(['/login'], {
                queryParams: { return_to: safeReturnTo(this.#router.url) },
            });
            return;
        }
        this.#postDialog.open({ operationNumber });
    }
}
