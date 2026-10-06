import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
    input,
    output,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectChange, MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { formatCalendarSummaryLabel } from 'src/app/core/utils/format-calendar-summary-label.util';
import { AgencyListStateQuery } from 'src/app/global-states/agency-list.state';
import { CalendarListStateQuery } from 'src/app/global-states/calendar-list.state';
import { RouteStationListStateQuery } from 'src/app/global-states/route-station-list.state';
import type { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import {
    FilterChipOption,
    FilterChipValue,
} from 'src/app/shared/filter-chips/filter-chip-option.type';
import { FilterChipsComponent } from 'src/app/shared/filter-chips/filter-chips.component';
import { DiagramDirectionFilter } from '../../stores/train-diagram.store';
import { buildRouteOptions } from '../../utils/build-route-options.util';
import {
    DIAGRAM_JUMP_HOURS,
    DIAGRAM_START_HOUR,
    formatHourLabel,
} from '../../utils/diagram-timeline.util';

/**
 * N1 ダイヤグラムの操作部（5.7）: 畳まない 2 行の表示設定（列車位置情報と同じ・
 * ユーザー判断 2026-09-26）。
 * 1 行目: 路線チップ（複数選択・横スクロール 1 行）
 * 2 行目: ダイヤ select・時刻へ跳ぶ・今・方向・横の縮尺
 *
 * controlled component として振る舞い、選択状態は親（route の matrix params）へ通知するのみで
 * 自身では保持しない。
 *
 * 路線チップは複数選択にすることで、選択路線を跨ぐ直通列車の全停車駅を網羅駅軸に載せ、
 * 1 本の連続した斜め線として描画できるようにする（train-location-controller の
 * 会社グルーピングパターンを踏襲）。
 */
@Component({
    selector: 'app-train-diagram-controller',
    templateUrl: './train-diagram-controller.component.html',
    styleUrl: './train-diagram-controller.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatFormFieldModule,
        MatSelectModule,
        MatButtonToggleModule,
        MatButtonModule,
        MatIconModule,
        MatTooltipModule,
        FilterChipsComponent,
    ],
})
export class TrainDiagramControllerComponent {
    readonly #calendarListStateQuery = inject(CalendarListStateQuery);
    readonly #routeStationListStateQuery = inject(RouteStationListStateQuery);
    readonly #agencyListStateQuery = inject(AgencyListStateQuery);

    readonly calendarId = input<string | null>(null);
    readonly selectedRouteIds = input<string[]>([]);
    readonly directionFilter = input<DiagramDirectionFilter>('both');
    readonly showNowButton = input<boolean>(false);

    readonly calendarIdChange = output<string>();
    readonly routeIdsChange = output<string[]>();
    readonly directionFilterChange = output<DiagramDirectionFilter>();
    readonly jumpToHour = output<number>();
    readonly jumpToNow = output<void>();
    readonly zoomStep = output<1 | -1>();

    readonly jumpHours = DIAGRAM_JUMP_HOURS;

    readonly calendars = toSignal(this.#calendarListStateQuery.calendars$, {
        initialValue: [],
    });
    readonly routes = toSignal(
        this.#routeStationListStateQuery.routeStations$,
        { initialValue: [] },
    );
    readonly agencies = toSignal(this.#agencyListStateQuery.agencies$, {
        initialValue: [],
    });

    readonly routeOptions = computed<FilterChipOption[]>(() =>
        buildRouteOptions(this.routes(), this.agencies()),
    );

    readonly calendarLabel = computed(() => {
        const calendar = this.calendars().find(
            (c) => c.calendarId === this.calendarId(),
        );
        return calendar ? formatCalendarSummaryLabel(calendar) : 'ダイヤ未選択';
    });

    /**
     * ダイヤ select の各 mat-option 表示に使う短縮ラベル（G0-7: 長い日付表記の truncate 解消）。
     * mat-select-trigger と同じ整形関数を再利用する。
     */
    calendarSummaryLabel(calendar: CalendarDetailsDto): string {
        return formatCalendarSummaryLabel(calendar);
    }

    hourLabel(hour: number): string {
        return formatHourLabel((hour - DIAGRAM_START_HOUR) * 60);
    }

    onCalendarChange(calendarId: string): void {
        this.calendarIdChange.emit(calendarId);
    }

    onRouteChange(values: FilterChipValue[]): void {
        this.routeIdsChange.emit(values.map((value) => String(value)));
    }

    /** 跳ぶだけの操作なので、選んだら select を空に戻す */
    onJump(event: MatSelectChange): void {
        const hour = event.value as number | null;
        event.source.value = null;
        if (hour !== null) {
            this.jumpToHour.emit(hour);
        }
    }
}
