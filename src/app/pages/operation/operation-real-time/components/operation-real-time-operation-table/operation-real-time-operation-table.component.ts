import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AgencyListStateQuery } from 'src/app/global-states/agency-list.state';
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component';
import { OperationRealTimeOperationCardComponent } from '../operation-real-time-operation-card/operation-real-time-operation-card.component';
import { OperationRealTimeStore } from '../../stores/operation-real-time.store';
import {
    matchesAgencyFilter,
    matchesGroupFilter,
} from '../../utils/operation-real-time-filter.util';

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
    readonly operationGroups = toSignal(OperationRealTimeStore.operationGroups$, {
        initialValue: [],
    });

    readonly filteredOperations = computed(() => {
        const operations = this.operations() ?? [];
        const selectedAgencyIds = this.selectedAgencyIds();
        const selectedGroupNames = this.selectedGroupNames();
        const groups = this.operationGroups();
        const timeCrossSections = this.timeCrossSections() ?? {};
        const formations = this.formations() ?? [];

        return operations.filter((operation) => {
            if (
                !matchesGroupFilter(
                    operation.operationNumber,
                    selectedGroupNames,
                    groups,
                )
            ) {
                return false;
            }

            const expectedFormation =
                timeCrossSections[operation.operationNumber]?.expectedSighting
                    ?.formation;
            const agencyId = expectedFormation
                ? formations.find(
                      (f) => f.formationId === expectedFormation.formationId,
                  )?.agencyId
                : undefined;

            return matchesAgencyFilter(agencyId, selectedAgencyIds);
        });
    });

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
