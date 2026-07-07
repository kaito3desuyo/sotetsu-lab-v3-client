import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { OperationRouteDiagramNavigateTimetable } from '../../interfaces/operation-route-diagram.interface';
import { OperationRouteDiagramService } from '../../services/operation-route-diagram.service';
import { OperationRouteDiagramStore } from '../../stores/operation-route-diagram.store';
import { OperationRouteDiagramDrawingPresentationalComponent } from '../operation-route-diagram-drawing-presentational/operation-route-diagram-drawing-presentational.component';

@Component({
    selector: 'app-operation-route-diagram-drawing-container',
    templateUrl: './operation-route-diagram-drawing-container.component.html',
    styleUrls: ['./operation-route-diagram-drawing-container.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [OperationRouteDiagramDrawingPresentationalComponent],
})
export class OperationRouteDiagramDrawingContainerComponent {
    readonly #operationRouteDiagramService = inject(
        OperationRouteDiagramService,
    );

    readonly calendar = toSignal(OperationRouteDiagramStore.calendar$);
    readonly operation = toSignal(OperationRouteDiagramStore.operation$);
    readonly tripOperationLists = toSignal(
        OperationRouteDiagramStore.tripOperationLists$,
    );
    // B5: 路線チップの選択状態で絞り込んだ表示駅リスト（縦軸）。
    // SVG 描画（drawing-presentational）は座標系・線分再接続ロジックを一切変更せず、
    // この絞り込み済みリストをそのまま受け取るだけで隠れた駅を飛ばして再接続する。
    readonly stations = toSignal(OperationRouteDiagramStore.visibleStations$);

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
