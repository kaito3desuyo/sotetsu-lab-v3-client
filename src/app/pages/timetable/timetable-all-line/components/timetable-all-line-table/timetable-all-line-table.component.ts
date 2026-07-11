import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    input,
    output,
    signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import dayjs from 'dayjs';
import { PipesModule } from 'src/app/core/pipes/pipes.module';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { tripDirectionLabel } from 'src/app/libs/trip/special/constants/trip.constant';
import { ETripDirection } from 'src/app/libs/trip/special/enums/trip.enum';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';
import { OperationNumberTagComponent } from 'src/app/shared/operation-number-tag/operation-number-tag.component';
import { TripClassBaseNamePipe } from 'src/app/shared/pipes/trip-class-base-name.pipe';
import { ETimetableAllLineStationViewMode } from '../../enums/timetable-all-line.enum';
import { TimetableAllLineGetStationNumberingPipe } from '../../pipes/timetable-all-line-get-station-numbering.pipe';
import { TimetableAllLineGetTimePipe } from '../../pipes/timetable-all-line-get-time.pipe';

@Component({
    selector: 'app-timetable-all-line-table',
    templateUrl: './timetable-all-line-table.component.html',
    styleUrls: [
        './timetable-all-line-table.component.scss',
        '../../../../../../assets/fonts/DiaPro-web/DiaPro.css',
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        RouterLink,
        MatPaginatorModule,
        MatTooltipModule,
        MatButtonModule,
        MatIconModule,
        PipesModule,
        OperationNumberTagComponent,
        TimetableAllLineGetStationNumberingPipe,
        TimetableAllLineGetTimePipe,
        TripClassBaseNamePipe,
    ],
})
export class TimetableAllLineTableComponent {
    readonly staitonViewModeEnum = ETimetableAllLineStationViewMode;
    readonly tripDirectionEnum = ETripDirection;
    readonly tripDirectionLabel = tripDirectionLabel;

    readonly calendar = input<CalendarDetailsDto>();
    readonly tripDirection = input.required<ETripDirection>();
    readonly stations = input.required<StationDetailsDto[]>();
    readonly trips = input.required<TripDetailsDto[]>();
    readonly pageSettings = input.required<PageEvent>();
    readonly viewModes =
        input.required<
            ReadonlyMap<string, ETimetableAllLineStationViewMode>
        >();
    readonly bordersAfter = input.required<ReadonlyMap<string, boolean>>();

    readonly page = output<PageEvent>();
    readonly clickEditButton = output<TripDetailsDto>();
    readonly clickCopyButton = output<TripDetailsDto>();
    readonly clickDeleteButton = output<TripDetailsDto>();
    readonly clickAddTripInGroup = output<{
        base: TripDetailsDto;
        target: TripDetailsDto;
    }>();
    readonly clickDeleteTripInGroup = output<{
        base: TripDetailsDto;
        target: TripDetailsDto;
    }>();

    readonly groupingBaseTrip = signal<TripDetailsDto | undefined>(undefined);

    readonly isHolidayCalendar = computed(() => {
        const calendar = this.calendar();
        return !!calendar && (calendar.sunday || calendar.saturday);
    });

    readonly isFeatureDate = computed(() => {
        const date = this.calendar()?.startDate;
        return !!date && dayjs() > dayjs(date, 'YYYY-MM-DD');
    });
}
