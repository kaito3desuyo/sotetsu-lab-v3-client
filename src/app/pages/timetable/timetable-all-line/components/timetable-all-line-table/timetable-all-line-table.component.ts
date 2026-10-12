import { BreakpointObserver } from '@angular/cdk/layout';
import { NgTemplateOutlet } from '@angular/common';
import {
    afterRenderEffect,
    ChangeDetectionStrategy,
    Component,
    computed,
    ElementRef,
    inject,
    input,
    output,
    signal,
    viewChild,
    viewChildren,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { isAfter, parse } from 'date-fns';
import { isEqual } from 'es-toolkit';
import { map } from 'rxjs';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { tripDirectionLabel } from 'src/app/libs/trip/usecase/constants/trip.constant';
import { ETripDirection } from 'src/app/libs/trip/usecase/enums/trip.enum';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';
import { CalendarBandComponent } from 'src/app/shared/calendar-band/calendar-band.component';
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component';
import { OperationNumberTagComponent } from 'src/app/shared/operation-number-tag/operation-number-tag.component';
import { TripClassShortNamePipe } from 'src/app/core/pipes/trip-class-short-name.pipe';
import { TripClassChipComponent } from 'src/app/shared/trip-class-chip/trip-class-chip.component';
import { ETimetableAllLineStationViewMode } from '../../enums/timetable-all-line.enum';
import { TimetableAllLineGetStationNumberingPipe } from '../../pipes/timetable-all-line-get-station-numbering.pipe';
import { stickyBottomOffsets } from '../../utils/sticky-bottom-offsets.util';
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
        NgTemplateOutlet,
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
    /** 箱の下端に積んで固定する段（終着時刻・終着駅・編集・コピー・削除・グループ）。上から順 */
    protected readonly bottomRows =
        viewChildren<ElementRef<HTMLElement>>('bottomRow');
    /**
     * 始発駅の段の高さ（px）。縦書きの駅名の長さで変わるので描画後に測り、
     * 始発時刻の段の固定位置（top）に使う。
     */
    readonly originNameRowHeight = signal(0);
    /**
     * 下端に積む段それぞれの bottom（px）。null の段は固定しない。終着駅の高さは駅名の長さで、
     * ボタンの段はグルーピング中のボタンで変わるので、描画後に測る。
     * ボタンの 4 段を固定するのは md 以上だけ（ユーザー指示 2026-10-12。スマホ幅では
     * 上下の固定で時刻の見える高さが 330px ほどになり窮屈だった）。
     */
    readonly bottomRowOffsets = signal<(number | null)[]>([]);
    readonly #isMdUp = toSignal(
        inject(BreakpointObserver)
            .observe('(min-width: 768px)')
            .pipe(map((state) => state.matches)),
        { initialValue: false },
    );

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
            this.groupingBaseTrip();
            const origin = measure(this.originNameRow());
            if (origin !== this.originNameRowHeight()) {
                this.originNameRowHeight.set(origin);
            }
            const isMdUp = this.#isMdUp();
            const rows = this.bottomRows();
            // 上の 2 段（終着時刻・終着駅）はいつも固定、残りのボタンの段は md 以上だけ
            const offsets = stickyBottomOffsets(
                rows.map((row) => measure(row)),
                rows.map((_, index) => index < 2 || isMdUp),
            );
            if (!isEqual(offsets, this.bottomRowOffsets())) {
                this.bottomRowOffsets.set(offsets);
            }
        });
    }

    readonly isFeatureDate = computed(() => {
        const date = this.calendar()?.startDate;
        return (
            !!date && isAfter(new Date(), parse(date, 'yyyy-MM-dd', new Date()))
        );
    });
}
