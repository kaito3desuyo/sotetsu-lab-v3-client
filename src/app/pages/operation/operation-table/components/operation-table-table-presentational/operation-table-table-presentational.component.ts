import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    input,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { DateFnsPipe } from 'src/app/core/pipes/dateFns.pipe';
import { PipesModule } from 'src/app/core/pipes/pipes.module';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { OperationTripsDto } from 'src/app/libs/operation/usecase/dtos/operation-trips.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';
import { ETripDirection } from 'src/app/libs/trip/special/enums/trip.enum';
import { OperationTableFormatStationNamePipe } from '../../pipes/operation-table-format-station-name.pipe';
import { OperationTableFormatTripClassNamePipe } from '../../pipes/operation-table-format-trip-class-name.pipe';

@Component({
    standalone: true,
    selector: 'app-operation-table-table-presentational',
    templateUrl: './operation-table-table-presentational.component.html',
    styleUrls: ['./operation-table-table-presentational.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        RouterLink,
        PipesModule,
        DateFnsPipe,
        OperationTableFormatStationNamePipe,
        OperationTableFormatTripClassNamePipe,
    ],
})
export class OperationTableTablePresentationalComponent {
    readonly tripDirectionEnum = ETripDirection;

    readonly calendar = input.required<CalendarDetailsDto>();
    readonly operationTrips = input.required<OperationTripsDto[]>();
    readonly stations = input.required<StationDetailsDto[]>();
    readonly tripClasses = input.required<TripClassDetailsDto[]>();

    readonly isHolidayCalendar = computed(() => {
        const calendar = this.calendar();
        return calendar.sunday || calendar.saturday;
    });
}
