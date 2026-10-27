import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
} from '@angular/core';
import { AgencyListState } from 'src/app/global-states/agency-list.state';
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component';
import { OperationRealTimeOperationCardComponent } from '../operation-real-time-operation-card/operation-real-time-operation-card.component';
import { OperationRealTimeSkeletonLedgerComponent } from '../operation-real-time-skeleton-ledger/operation-real-time-skeleton-ledger.component';
import { OperationRealTimeStore } from '../../stores/operation-real-time.store';
import { filterRealTimeOperations } from '../../utils/operation-real-time-filter.util';

@Component({
    selector: 'app-operation-real-time-operation-table',
    templateUrl: './operation-real-time-operation-table.component.html',
    styleUrl: './operation-real-time-operation-table.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        EmptyStateComponent,
        OperationRealTimeOperationCardComponent,
        OperationRealTimeSkeletonLedgerComponent,
    ],
})
export class OperationRealTimeOperationTableComponent {
    readonly #store = inject(OperationRealTimeStore);
    readonly #agencyListState = inject(AgencyListState);

    readonly agencies = this.#agencyListState.agencies;
    /**
     * 目撃データの取得中フラグ。カードへ渡して、未到着と「目撃が無い」を
     * 区別させる（audit M4）。ページ上部の進捗バーと同じ出所。
     */
    readonly isLoading = this.#store.isLoading;
    readonly stations = this.#store.stations;
    readonly tripClasses = this.#store.tripClasses;
    readonly calendar = this.#store.calendar;
    readonly itineraryLinks = this.#store.itineraryLinks;
    readonly operations = this.#store.sortedOperations;
    readonly hasFetchedOperations = this.#store.hasFetchedOperations;
    readonly formations = this.#store.sortedFormations;
    readonly timeCrossSections = this.#store.operationSightingTimeCrossSections;
    readonly histories = this.#store.operationSightingHistories;
    readonly currentPositions = this.#store.currentPositions;
    readonly isVisibleCurrentPosition = this.#store.isVisibleCurrentPosition;
    readonly isVisibleSightingHistories =
        this.#store.isVisibleSightingHistories;
    readonly selectedAgencyIds = this.#store.selectedAgencyIds;
    readonly selectedGroupNames = this.#store.normalizedSelectedGroupNames;

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
