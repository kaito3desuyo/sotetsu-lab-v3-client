import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AgencyListStateQuery } from 'src/app/global-states/agency-list.state';
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component';
import { OperationRealTimeFormationCardComponent } from '../operation-real-time-formation-card/operation-real-time-formation-card.component';
import { OperationRealTimeStore } from '../../stores/operation-real-time.store';
import {
    matchesAgencyFilter,
    matchesGroupFilter,
    withRetiredGroup,
} from '../../utils/operation-real-time-filter.util';

@Component({
    selector: 'app-operation-real-time-formation-table',
    templateUrl: './operation-real-time-formation-table.component.html',
    styleUrl: './operation-real-time-formation-table.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [EmptyStateComponent, OperationRealTimeFormationCardComponent],
})
export class OperationRealTimeFormationTableComponent {
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
        OperationRealTimeStore.formationSightingTimeCrossSections$,
    );
    readonly histories = toSignal(
        OperationRealTimeStore.formationSightingHistories$,
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

    readonly filteredFormations = computed(() => {
        const formations = this.formations() ?? [];
        const selectedAgencyIds = this.selectedAgencyIds();
        const selectedGroupNames = this.selectedGroupNames();
        const groups = withRetiredGroup(this.operationGroups());
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
                groups,
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
                timeCrossSections[formationNumber]?.expectedSighting
                    ?.operation?.operationNumber;
            return expectedOperationNumber
                ? (currentPositions[expectedOperationNumber] ?? undefined)
                : undefined;
        });
}
