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
import dayjs from 'dayjs';
import { PipesModule } from 'src/app/core/pipes/pipes.module';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { tripDirectionLabel } from 'src/app/libs/trip/special/constants/trip.constant';
import { ETripDirection } from 'src/app/libs/trip/special/enums/trip.enum';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';
import { ETimetableAllLineStationViewMode } from '../../enums/timetable-all-line.enum';
import { TimetableAllLineGetBorderSettingPipe } from '../../pipes/timetable-all-line-get-border-setting.pipe';
import { TimetableAllLineGetStationNumberingPipe } from '../../pipes/timetable-all-line-get-station-numbering.pipe';
import { TimetableAllLineGetTimePipe } from '../../pipes/timetable-all-line-get-time.pipe';
import { TimetableAllLineGetViewModePipe } from '../../pipes/timetable-all-line-get-view-mode.pipe';
import { RouterLink } from '@angular/router';

@Component({
    standalone: true,
    selector: 'app-timetable-all-line-table-p',
    templateUrl: './timetable-all-line-table-p.component.html',
    styleUrls: [
        './timetable-all-line-table-p.component.scss',
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
        TimetableAllLineGetBorderSettingPipe,
        TimetableAllLineGetStationNumberingPipe,
        TimetableAllLineGetTimePipe,
        TimetableAllLineGetViewModePipe,
    ],
})
export class TimetableAllLineTablePComponent {
    readonly staitonViewModeEnum = ETimetableAllLineStationViewMode;
    readonly tripDirectionEnum = ETripDirection;
    readonly tripDirectionLabel = tripDirectionLabel;

    readonly calendar = input.required<CalendarDetailsDto>();
    readonly tripDirection = input.required<ETripDirection>();
    readonly stations = input.required<StationDetailsDto[]>();
    readonly trips = input.required<TripDetailsDto[]>();
    readonly pageSettings = input.required<PageEvent>();

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
        return calendar.sunday || calendar.saturday;
    });

    readonly isFeatureDate = computed(() => {
        const date = this.calendar().startDate;
        return dayjs() > dayjs(date, 'YYYY-MM-DD');
    });
}
