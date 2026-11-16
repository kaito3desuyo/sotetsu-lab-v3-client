import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/**
 * 一部の取得に失敗したときの知らせ（薄い橙の帯）。
 * 画面は出せたが取得の一部が取れなかったときに、「無い」と「取れなかった」を見分けられるよう出す。
 * 置き場所と左右の端は使う側が決める（docs/design.md「一部取れなかったとき」）。
 */
@Component({
    selector: 'app-partial-failure-notice',
    templateUrl: './partial-failure-notice.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatIconModule],
})
export class PartialFailureNoticeComponent {}
