import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
    output,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component';
import { OperationRouteDiagramNavigateTimetable } from '../../interfaces/operation-route-diagram.interface';
import { OperationRouteDiagramService } from '../../services/operation-route-diagram.service';
import { OperationRouteDiagramStore } from '../../stores/operation-route-diagram.store';
import { reconnectTripOperationLists } from '../../utils/operation-route-diagram-reconnect-trip-operation-lists.util';
import { OperationRouteDiagramDrawingPresentationalComponent } from '../operation-route-diagram-drawing-presentational/operation-route-diagram-drawing-presentational.component';

@Component({
    selector: 'app-operation-route-diagram-drawing-container',
    templateUrl: './operation-route-diagram-drawing-container.component.html',
    styleUrls: ['./operation-route-diagram-drawing-container.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        EmptyStateComponent,
        OperationRouteDiagramDrawingPresentationalComponent,
    ],
})
export class OperationRouteDiagramDrawingContainerComponent {
    readonly #operationRouteDiagramService = inject(
        OperationRouteDiagramService,
    );

    /** G12: 空状態の次アクション（運用表を見る）をページへ委譲する（Router 非依存の container に保つ）。 */
    readonly emptyStateActionClick = output<void>();

    readonly calendar = toSignal(OperationRouteDiagramStore.calendar$);
    readonly operation = toSignal(OperationRouteDiagramStore.operation$);
    readonly #rawTripOperationLists = toSignal(
        OperationRouteDiagramStore.tripOperationLists$,
    );
    // B5: 路線チップ絞り込み前の全駅順（再接続の基準になる）。
    readonly #allStations = toSignal(OperationRouteDiagramStore.stations$);
    // B5: 路線チップの選択状態で絞り込んだ表示駅リスト（縦軸）。
    readonly stations = toSignal(OperationRouteDiagramStore.visibleStations$);

    // B5: 路線チップ OFF で縦軸から消えた駅を始発/終着に持つ行路を、表示中の
    // 最寄り駅へ再接続する（受け入れ条件「隠れた駅を飛ばして描画する」）。
    // SVG 描画（drawing-presentational）の座標系・findById による index 計算は
    // 一切変更せず、その入力となる駅 ID をここで付け替えるだけに留める。
    readonly tripOperationLists = computed(() => {
        const raw = this.#rawTripOperationLists();
        if (!raw) return raw;

        return reconnectTripOperationLists(
            raw,
            this.#allStations() ?? [],
            this.stations() ?? [],
        );
    });

    readonly drawingDisplayed = computed(
        () =>
            !!this.calendar() &&
            !!this.operation() &&
            !!this.stations()?.length &&
            !!this.tripOperationLists(),
    );

    onReceiveClickNavigateTimetable(
        ev: OperationRouteDiagramNavigateTimetable,
    ): void {
        this.#operationRouteDiagramService.emitNavigateTimetableEvent(ev);
    }
}
