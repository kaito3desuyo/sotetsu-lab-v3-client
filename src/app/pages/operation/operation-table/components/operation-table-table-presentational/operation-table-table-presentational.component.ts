import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { OperationTripsDto } from 'src/app/libs/operation/usecase/dtos/operation-trips.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';

@Component({
    selector: 'app-operation-table-table-presentational',
    templateUrl: './operation-table-table-presentational.component.html',
    styleUrls: ['./operation-table-table-presentational.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OperationTableTablePresentationalComponent {
    @Input() calendar: CalendarDetailsDto;
    @Input() allOperationTrips: OperationTripsDto[];
    @Input() stations: StationDetailsDto[];
    @Input() tripClasses: TripClassDetailsDto[];

    constructor() {}
}