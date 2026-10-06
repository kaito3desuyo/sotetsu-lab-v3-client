import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AgencyListStateQuery } from 'src/app/global-states/agency-list.state';
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component';
import { OperationRealTimeOperationCardComponent } from '../operation-real-time-operation-card/operation-real-time-operation-card.component';
import { OperationRealTimeStore } from '../../stores/operation-real-time.store';
import { filterRealTimeOperations } from '../../utils/operation-real-time-filter.util';

@Component({
    selector: 'app-operation-real-time-operation-table',
    templateUrl: './operation-real-time-operation-table.component.html',
    styleUrl: './operation-real-time-operation-table.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [EmptyStateComponent, OperationRealTimeOperationCardComponent],
})
export class OperationRealTimeOperationTableComponent {
    readonly #agencyListStateQuery = inject(AgencyListStateQuery);

    readonly agencies = toSignal(this.#agencyListStateQuery.agencies$, {
        initialValue: [],
    });
    /**
     * 目撃データの取得中フラグ。カードへ渡して、未到着と「目撃が無い」を
     * 区別させる（audit M4）。ページ上部の進捗バーと同じ出所。
     */
    readonly isLoading = toSignal(OperationRealTimeStore.isLoading$, {
        initialValue: false,
    });
    readonly stations = toSignal(OperationRealTimeStore.stations$);
    readonly tripClasses = toSignal(OperationRealTimeStore.tripClasses$);
    readonly calendar = toSignal(OperationRealTimeStore.calendar$);
    readonly operations = toSignal(OperationRealTimeStore.operations$);
    readonly formations = toSignal(OperationRealTimeStore.formations$);
    readonly timeCrossSections = toSignal(
        OperationRealTimeStore.operationSightingTimeCrossSections$,
    );
    readonly histories = toSignal(
        OperationRealTimeStore.operationSightingHistories$,
    );
    readonly currentPositions = toSignal(
        OperationRealTimeStore.currentPositions$,
    );
    readonly isVisibleCurrentPosition = toSignal(
        OperationRealTimeStore.isVisibleCurrentPosition$,
    );
    readonly isVisibleSightingHistories = toSignal(
        OperationRealTimeStore.isVisibleSightingHistories$,
    );
    readonly selectedAgencyIds = toSignal(
        OperationRealTimeStore.selectedAgencyIds$,
        { initialValue: [] },
    );
    readonly selectedGroupNames = toSignal(
        OperationRealTimeStore.selectedGroupNames$,
        { initialValue: [] },
    );

    readonly filteredOperations = computed(() =>
        filterRealTimeOperations(
            this.operations() ?? [],
            this.selectedAgencyIds(),
            this.selectedGroupNames(),
            this.timeCrossSections() ?? {},
            this.formations() ?? [],
        ),
    );

    readonly queryTimeCrossSectionByOperationNumber = (
        operationNumber: string,
    ) =>
        computed(() => {
            const crossSections = this.timeCrossSections();
            return crossSections[operationNumber] ?? undefined;
        });
    readonly queryHistoriesByOperationNumber = (operationNumber: string) =>
        computed(() => {
            const histories = this.histories();
            return histories[operationNumber] ?? [];
        });
    readonly queryCurrentPositionByOperationNumber = (
        operationNumber: string,
    ) =>
        computed(() => {
            const currentPositions = this.currentPositions();
            return currentPositions[operationNumber] ?? undefined;
        });
}
