import { ChangeDetectionStrategy, Component } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FilterChipValue } from 'src/app/shared/filter-chips/filter-chip-option.type';
import { FilterChipsComponent } from 'src/app/shared/filter-chips/filter-chips.component';
import { OperationRouteDiagramStore } from '../../stores/operation-route-diagram.store';

/**
 * B5: 運用行路図の路線絞り込みチップ。
 *
 * 既定 ON は「当該運用が経由する路線のみ」（OperationRouteDiagramStore.initializeSelectedRouteIds
 * で運用データ取得後に設定される）。経由しない路線は disabled + OFF で表示する。
 */
@Component({
    selector: 'app-operation-route-diagram-route-filter',
    templateUrl: './operation-route-diagram-route-filter.component.html',
    styleUrl: './operation-route-diagram-route-filter.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FilterChipsComponent],
})
export class OperationRouteDiagramRouteFilterComponent {
    readonly routeOptions = toSignal(OperationRouteDiagramStore.routeOptions$, {
        initialValue: [],
    });
    readonly selectedRouteIds = toSignal(
        OperationRouteDiagramStore.selectedRouteIds$,
        { initialValue: [] },
    );

    onChange(values: FilterChipValue[]): void {
        OperationRouteDiagramStore.setSelectedRouteIds(values);
    }
}
