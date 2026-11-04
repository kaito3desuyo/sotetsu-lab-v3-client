import {
    ChangeDetectionStrategy,
    Component,
    input,
    output,
} from '@angular/core';

/**
 * 目撃募集の札（2026-11 B3）。いま走っていて今日まだ目撃の無い運用の数を `目撃募集 3 ›` と出す。
 * 押すと toggled を出し、運用順の一覧を募集中の運用だけに絞る・解くのは親（ページ）が決める。
 * 絞っている間（active）は app-filter-chips の選択と同じオレンジで塗り、末尾の印を `✕` にする。
 * 0 件・viewer の判定と、絞りの状態の保持は親が持つ（この部品は渡された値を描くだけ）。
 */
@Component({
    selector: 'app-operation-real-time-sighting-call',
    templateUrl: './operation-real-time-sighting-call.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    // ホストを flex にして、中のボタンの行ボックス（文字の下端の余白）で行の高さが伸びないようにする
    host: { class: 'tw-flex' },
})
export class OperationRealTimeSightingCallComponent {
    /** 募集中の運用の数 */
    readonly count = input.required<number>();
    /** 運用順を募集中だけに絞っている間は true */
    readonly active = input.required<boolean>();
    readonly toggled = output<void>();
}
