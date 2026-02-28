import { JsonPipe } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TodaysOperationListStateQuery } from 'src/app/global-states/todays-operation-list.state';
import { OperationRealTimeStore } from '../../stores/operation-real-time.store';

@Component({
    selector: 'app-operation-real-time-table',
    templateUrl: './operation-real-time-table.component.html',
    styleUrl: './operation-real-time-table.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [JsonPipe],
})
export class OperationRealTimeTableComponent {
    readonly #todaysOperationsListStateQuery = inject(
        TodaysOperationListStateQuery,
    );

    readonly operations = toSignal(
        this.#todaysOperationsListStateQuery.todaysOperationsSorted$,
    );
    readonly operationSightingTimeCrossSections = toSignal(
        OperationRealTimeStore.operationSightingTimeCrossSections$,
    );

    readonly queryOperationTimeCrossSectionByOperationNumber = (
        operationNumber: string,
    ) =>
        computed(() => {
            const crossSections = this.operationSightingTimeCrossSections();
            return crossSections[operationNumber];
        });
}
