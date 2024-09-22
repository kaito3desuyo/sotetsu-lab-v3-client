import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    input,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { max } from 'lodash-es';
import { PipesModule } from 'src/app/core/pipes/pipes.module';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { OperationSightingTimeCrossSectionDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-time-cross-section.dto';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';
import { tripDirectionLabel } from 'src/app/libs/trip/special/constants/trip.constant';
import { ETripDirection } from 'src/app/libs/trip/special/enums/trip.enum';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';
import { TimetableStationFindLastStopStationPipe } from '../../pipes/timetable-station-find-last-stop-station.pipe';
import { TimetableStationFindOtherTripsInSameTripBlockPipe } from '../../pipes/timetable-station-find-other-trips-in-same-trip-block.pipe';

@Component({
    standalone: true,
    selector: 'app-timetable-station-table-p',
    templateUrl: './timetable-station-table-p.component.html',
    styleUrls: ['./timetable-station-table-p.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        RouterLink,
        PipesModule,
        TimetableStationFindLastStopStationPipe,
        TimetableStationFindOtherTripsInSameTripBlockPipe,
    ],
})
export class TimetableStationTablePComponent {
    readonly tripDirectionEnum = ETripDirection;
    readonly tripDirectionLabel = tripDirectionLabel;

    readonly calendar = input.required<CalendarDetailsDto>();
    readonly stationName = input.required<StationDetailsDto['stationName']>();
    readonly tripDirection = input.required<ETripDirection>();
    readonly tripClasses = input.required<TripClassDetailsDto[]>();
    readonly stations = input.required<StationDetailsDto[]>();
    readonly timetableData = input.required<
        {
            day: number;
            hour: string;
            trips: TripDetailsDto[];
        }[]
    >();
    readonly operations = input.required<OperationDetailsDto[]>();
    readonly operationSightingTimeCrossSections =
        input.required<OperationSightingTimeCrossSectionDto[]>();

    readonly isHolidayCalendar = computed(() => {
        const calendar = this.calendar();
        return calendar.sunday || calendar.saturday;
    });

    readonly maxColumnsCount = computed(() => {
        const data = this.timetableData();
        return max(data.map((o) => o.trips.length));
    });
}
