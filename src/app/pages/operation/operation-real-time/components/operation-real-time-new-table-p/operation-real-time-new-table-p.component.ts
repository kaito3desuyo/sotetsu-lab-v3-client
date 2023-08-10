import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { ForModule } from '@rx-angular/template/for';
import { IfModule } from '@rx-angular/template/if';
import { LetModule } from '@rx-angular/template/let';
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
        LetModule,
        ForModule,
        IfModule,
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

    @Input() primaryKey: OperationRealTimeTableColumn;
    @Input() trackByKey: string;
    @Input() displayedColumns: OperationRealTimeTableColumn[];
    @Input() data: IOperationRealTimeTableData[];
    @Input() todaysCalendarId: CalendarDetailsDto['calendarId'];
    @Input() stations: StationDetailsDto[];
    @Input() tripClasses: TripClassDetailsDto[];
}