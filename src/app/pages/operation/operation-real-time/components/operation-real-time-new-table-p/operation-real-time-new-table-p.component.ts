import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    input,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { get } from 'lodash-es';
import { PipesModule } from 'src/app/core/pipes/pipes.module';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';
import { CurrentPositionLinkModule } from 'src/app/shared/current-position-link/current-position-link.module';
import { FormationNumberLinkModule } from 'src/app/shared/formation-number-link/formation-number-link.module';
import { OperationNumberLinkModule } from 'src/app/shared/operation-number-link/operation-number-link.module';
import {
    OperationRealTimeTableColumn,
    OperationRealTimeTableColumnLabel,
} from '../../enums/operation-real-time.enum';
import { IOperationRealTimeTableData } from '../../interfaces/operation-real-time-table-data.interface';

@Component({
    standalone: true,
    selector: 'app-operation-real-time-new-table-p',
    templateUrl: './operation-real-time-new-table-p.component.html',
    styleUrls: ['./operation-real-time-new-table-p.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        MatIconModule,
        MatTooltipModule,
        PipesModule,
        OperationNumberLinkModule,
        FormationNumberLinkModule,
        CurrentPositionLinkModule,
    ],
})
export class OperationRealTimeNewTablePComponent {
    readonly operationRealTimeTableColumn = OperationRealTimeTableColumn;
    readonly operationRealTimeTableColumnLabel =
        OperationRealTimeTableColumnLabel;

    readonly primaryKey = input.required<OperationRealTimeTableColumn>();
    readonly trackByKey = input.required<string>();
    readonly displayedColumns =
        input.required<OperationRealTimeTableColumn[]>();
    readonly data = input.required<IOperationRealTimeTableData[]>();
    readonly todaysCalendarId =
        input.required<CalendarDetailsDto['calendarId']>();
    readonly stations = input.required<StationDetailsDto[]>();
    readonly tripClasses = input.required<TripClassDetailsDto[]>();

    readonly trackBy = computed(
        () => (row: IOperationRealTimeTableData) => get(row, this.trackByKey()),
    );
}
