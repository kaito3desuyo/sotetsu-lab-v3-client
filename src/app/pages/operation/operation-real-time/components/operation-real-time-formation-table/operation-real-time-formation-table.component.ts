import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
} from '@angular/core';
import { AgencyListState } from 'src/app/global-states/agency-list.state';
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component';
import { OperationRealTimeFormationCardComponent } from '../operation-real-time-formation-card/operation-real-time-formation-card.component';
import { OperationRealTimeSkeletonLedgerComponent } from '../operation-real-time-skeleton-ledger/operation-real-time-skeleton-ledger.component';
import { OperationRealTimeStore } from '../../stores/operation-real-time.store';
import { matchesAgencyFilter } from '../../utils/operation-real-time-filter.util';
import { matchesGroupFilter } from 'src/app/shared/operation-group.util';

@Component({
    selector: 'app-operation-real-time-formation-table',
    templateUrl: './operation-real-time-formation-table.component.html',
    styleUrl: './operation-real-time-formation-table.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        EmptyStateComponent,
        OperationRealTimeFormationCardComponent,
        OperationRealTimeSkeletonLedgerComponent,
    ],
})
export class OperationRealTimeFormationTableComponent {
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
    readonly formations = this.#store.sortedFormations;
    readonly hasFetchedFormations = this.#store.hasFetchedFormations;
    readonly timeCrossSections = this.#store.formationSightingTimeCrossSections;
    readonly histories = this.#store.formationSightingHistories;
    readonly currentPositions = this.#store.currentPositions;
    readonly isVisibleCurrentPosition = this.#store.isVisibleCurrentPosition;
    readonly isVisibleSightingHistories =
        this.#store.isVisibleSightingHistories;
    readonly selectedAgencyIds = this.#store.selectedAgencyIds;
    readonly selectedGroupNames = this.#store.normalizedSelectedGroupNames;

    readonly filteredFormations = computed(() => {
        const formations = this.formations() ?? [];
        const selectedAgencyIds = this.selectedAgencyIds();
        const selectedGroupNames = this.selectedGroupNames();
        const timeCrossSections = this.timeCrossSections() ?? {};

        return formations.filter((formation) => {
            if (!matchesAgencyFilter(formation.agencyId, selectedAgencyIds)) {
                return false;
            }

            const expectedOperationNumber =
                timeCrossSections[formation.formationNumber]?.expectedSighting
                    ?.operation?.operationNumber;

            return matchesGroupFilter(
                expectedOperationNumber,
                selectedGroupNames,
            );
        });
    });

    readonly queryTimeCrossSectionByFormationNumber = (
        formationNumber: string,
    ) =>
        computed(() => {
            const timeCrossSections = this.timeCrossSections();
            return timeCrossSections[formationNumber] ?? undefined;
        });
    readonly queryHistoriesByFormationNumber = (formationNumber: string) =>
        computed(() => {
            const histories = this.histories();
            return histories[formationNumber] ?? [];
        });
    readonly queryCurrentPositionByFormationNumber = (
        formationNumber: string,
    ) =>
        computed(() => {
            const timeCrossSections = this.timeCrossSections();
            const currentPositions = this.currentPositions();
            const expectedOperationNumber =
                timeCrossSections[formationNumber]?.expectedSighting?.operation
                    ?.operationNumber;
            return expectedOperationNumber
                ? (currentPositions[expectedOperationNumber] ?? undefined)
                : undefined;
        });
}
