import { CommonModule } from '@angular/common';
import {
    afterRenderEffect,
    ChangeDetectionStrategy,
    Component,
    computed,
    ElementRef,
    input,
    output,
    signal,
    viewChild,
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
import { CalendarBandComponent } from 'src/app/shared/calendar-band/calendar-band.component';
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component';
import { OperationNumberTagComponent } from 'src/app/shared/operation-number-tag/operation-number-tag.component';
import { TripClassShortNamePipe } from 'src/app/shared/pipes/trip-class-short-name.pipe';
import { TripClassChipComponent } from 'src/app/shared/trip-class-chip/trip-class-chip.component';
import { ETimetableAllLineStationViewMode } from '../../enums/timetable-all-line.enum';
import { TimetableAllLineGetStationNumberingPipe } from '../../pipes/timetable-all-line-get-station-numbering.pipe';
import { TimetableAllLineGetTimePipe } from '../../pipes/timetable-all-line-get-time.pipe';
import { TripEndpoints } from '../../utils/trip-endpoints.util';

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
        CalendarBandComponent,
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
    /** 列車ごとの始発駅・終着駅とその時刻（表の上端・下端の行）。 */
    readonly endpoints = input<ReadonlyMap<string, TripEndpoints>>(new Map());
    /** 列車ごとの、列の並びで 1 つ前の列車（ページ分けの前の並びから引いたもの）。 */
    readonly previousTrips = input<ReadonlyMap<string, TripDetailsDto>>(
        new Map(),
    );

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

    // signal query は ES private（#）にできない Angular 制約があるため protected
    protected readonly originNameRow =
        viewChild<ElementRef<HTMLElement>>('originNameRow');
    protected readonly terminusNameRow =
        viewChild<ElementRef<HTMLElement>>('terminusNameRow');
    /**
     * 始発駅・終着駅の段の高さ（px）。縦書きの駅名の長さで変わるので描画後に測り、
     * 始発時刻の段の固定位置（top）と終着時刻の段の固定位置（bottom）に使う。
     */
    readonly originNameRowHeight = signal(0);
    readonly terminusNameRowHeight = signal(0);

    /** G12: 空状態の次アクションラベル（mockup-07 準拠）。 */
    readonly oppositeDirectionActionLabel = computed(() => {
        const opposite =
            this.tripDirection() === this.tripDirectionEnum.INBOUND
                ? this.tripDirectionEnum.OUTBOUND
                : this.tripDirectionEnum.INBOUND;
        return `${this.tripDirectionLabel.get(opposite)}時刻表を表示する`;
    });

    constructor() {
        afterRenderEffect(() => {
            // 列車（ページ）や注釈が変わったら測り直す
            this.trips();
            this.endpoints();
            const measure = (row: ElementRef<HTMLElement> | undefined) =>
                row?.nativeElement.getBoundingClientRect().height ?? 0;
            const origin = measure(this.originNameRow());
            const terminus = measure(this.terminusNameRow());
            if (origin !== this.originNameRowHeight()) {
                this.originNameRowHeight.set(origin);
            }
            if (terminus !== this.terminusNameRowHeight()) {
                this.terminusNameRowHeight.set(terminus);
            }
        });
    }

    readonly isFeatureDate = computed(() => {
        const date = this.calendar()?.startDate;
        return !!date && dayjs() > dayjs(date, 'YYYY-MM-DD');
    });
}
