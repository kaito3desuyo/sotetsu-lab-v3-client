import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SkeletonBarComponent } from 'src/app/shared/skeleton/skeleton-bar.component';

/**
 * 運用順・編成順の一覧を取る前に出す骨組み（docs/design.md「取得中は骨組みを出す」）。
 * 作りはダッシュボードの最新の目撃情報の骨組みと同じ。行の高さは本物のカード（67px）に合わせる
 */
@Component({
    selector: 'app-operation-real-time-skeleton-ledger',
    templateUrl: './operation-real-time-skeleton-ledger.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [SkeletonBarComponent],
})
export class OperationRealTimeSkeletonLedgerComponent {
    /** 画面 1 枚分を埋める数。はみ出した分は外側の高さで切る */
    readonly rows = Array.from({ length: 28 }, (_, i) => i);
}
