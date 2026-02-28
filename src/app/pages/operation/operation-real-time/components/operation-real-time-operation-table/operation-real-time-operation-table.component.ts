import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { DateFnsPipe } from 'src/app/core/pipes/dateFns.pipe';
import { NewAntiBracketsPipe } from 'src/app/core/pipes/new-anti-brackets.pipe';
import { NewFindByIdPipe } from 'src/app/core/pipes/new-find-by-id.pipe';
import { NewOperationNumberColorPipe } from 'src/app/core/pipes/new-operation-number-color.pipe';
import { NewOperationNumberLinkComponent } from 'src/app/shared/new-operation-number-link/new-operation-number-link.component';
import {
    OperationRealTimeTableColumn,
    OperationRealTimeTableColumnLabel,
} from '../../enums/operation-real-time.enum';
import { OperationRealTimeDayCountPipe } from '../../pipes/operation-real-time-day-count.pipe';
import { OperationRealTimeStore } from '../../stores/operation-real-time.store';

@Component({
    selector: 'app-operation-real-time-operation-table',
    templateUrl: './operation-real-time-operation-table.component.html',
    styleUrl: './operation-real-time-operation-table.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        RouterLink,
        MatIconModule,
        MatTooltipModule,
        NewOperationNumberLinkComponent,
        DateFnsPipe,
        NewFindByIdPipe,
        NewAntiBracketsPipe,
        NewOperationNumberColorPipe,
        OperationRealTimeDayCountPipe,
    ],
})
export class OperationRealTimeOperationTableComponent {
    readonly operationRealTimeTableColumn = OperationRealTimeTableColumn;
    readonly operationRealTimeTableColumnLabel =
        OperationRealTimeTableColumnLabel;

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

    readonly displayedColumns = computed(() => {
        const isVisibleSightingHistories = this.isVisibleSightingHistories();
        const isVisibleCurrentPosition = this.isVisibleCurrentPosition();

        return [
            OperationRealTimeTableColumn.OPERATION_NUMBER,
            OperationRealTimeTableColumn.FORMATION_NUMBER,
            OperationRealTimeTableColumn.SIGHTING_HISTORIES,
            OperationRealTimeTableColumn.CURRENT_POSITION,
            OperationRealTimeTableColumn.SIGHTING_TIME,
            OperationRealTimeTableColumn.UPDATED_AT,
        ].filter((column) => {
            if (column === OperationRealTimeTableColumn.SIGHTING_HISTORIES) {
                return isVisibleSightingHistories;
            }
            if (column === OperationRealTimeTableColumn.CURRENT_POSITION) {
                return isVisibleCurrentPosition;
            }
            return true;
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
            return [...(histories[operationNumber] ?? [])].reverse();
        });
    readonly queryCurrentPositionByOperationNumber = (
        operationNumber: string,
    ) =>
        computed(() => {
            const currentPositions = this.currentPositions();
            return currentPositions[operationNumber] ?? undefined;
        });
}
