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
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { tripDirectionLabel } from 'src/app/libs/trip/special/constants/trip.constant';
import { ETripDirection } from 'src/app/libs/trip/special/enums/trip.enum';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component';
import { OperationNumberTagComponent } from 'src/app/shared/operation-number-tag/operation-number-tag.component';
import { TripClassShortNamePipe } from 'src/app/shared/pipes/trip-class-short-name.pipe';
import { TripClassChipComponent } from 'src/app/shared/trip-class-chip/trip-class-chip.component';
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
        EmptyStateComponent,
        OperationNumberTagComponent,
        TimetableAllLineGetStationNumberingPipe,
        TimetableAllLineGetTimePipe,
        TripClassShortNamePipe,
        TripClassChipComponent,
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
        input.required<ReadonlyMap<string, ETimetableAllLineStationViewMode>>();
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
    /** G12: 0件時の空状態から、反対方向への切り替えを親（ページ）へ委譲する。 */
    readonly toggleDirection = output<void>();

    readonly groupingBaseTrip = signal<TripDetailsDto | undefined>(undefined);

    /** G12: 空状態の次アクションラベル（mockup-07 準拠）。 */
    readonly oppositeDirectionActionLabel = computed(() => {
        const opposite =
            this.tripDirection() === this.tripDirectionEnum.INBOUND
                ? this.tripDirectionEnum.OUTBOUND
                : this.tripDirectionEnum.INBOUND;
        return `${this.tripDirectionLabel.get(opposite)}時刻表を表示する`;
    });

    readonly isFeatureDate = computed(() => {
        const date = this.calendar()?.startDate;
        return !!date && dayjs() > dayjs(date, 'YYYY-MM-DD');
    });

    /**
     * 駅ブロック終端の罫線クラス（sticky セル用。実要素+::before の両方に効かせる）。
     * mockup-05: 路線境界（isRouteBoundary）は太い二重線、方向限定の終端
     * （枝線終点等の isBlockEnd）は従来どおりの通常線にする。
     */
    protected stickyBottomBorderClass(
        isRouteBoundary: boolean,
        isBlockEnd: boolean,
    ): Record<string, boolean> {
        const solid = isBlockEnd && !isRouteBoundary;
        return {
            'tw-border-b': solid,
            'before:tw-border-b': solid,
            'tw-border-b-[3px]': isRouteBoundary,
            'before:tw-border-b-[3px]': isRouteBoundary,
            'tw-border-double': isRouteBoundary,
            'before:tw-border-double': isRouteBoundary,
        };
    }

    /** 駅ブロック終端の罫線クラス（通常セル用。stickyBottomBorderClass の ::before 無し版）。 */
    protected cellBottomBorderClass(
        isRouteBoundary: boolean,
        isBlockEnd: boolean,
    ): Record<string, boolean> {
        const solid = isBlockEnd && !isRouteBoundary;
        return {
            'tw-border-b': solid,
            'tw-border-b-[3px]': isRouteBoundary,
            'tw-border-double': isRouteBoundary,
        };
    }
}
