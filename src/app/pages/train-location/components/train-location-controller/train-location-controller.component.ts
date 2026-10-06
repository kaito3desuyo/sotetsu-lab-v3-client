import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
    input,
    output,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { DateFnsPipe } from 'src/app/core/pipes/dateFns.pipe';
import { formatCalendarSummaryLabel } from 'src/app/core/utils/format-calendar-summary-label.util';
import { AgencyListStateQuery } from 'src/app/global-states/agency-list.state';
import { CalendarListStateQuery } from 'src/app/global-states/calendar-list.state';
import { RouteStationListStateQuery } from 'src/app/global-states/route-station-list.state';
import { sortByThroughServiceAgency } from 'src/app/shared/agencies-in-through-service-order.util';
import {
    FilterChipOption,
    FilterChipValue,
} from 'src/app/shared/filter-chips/filter-chip-option.type';
import { FilterChipsComponent } from 'src/app/shared/filter-chips/filter-chips.component';
import { SegmentToggleOption } from 'src/app/shared/segment-toggle/segment-toggle-option.type';
import { SegmentToggleComponent } from 'src/app/shared/segment-toggle/segment-toggle.component';
import { TrainLocationMode } from '../../stores/train-location.store';

/**
 * 列車位置情報の表示設定。畳まず 2 行（ユーザー判断 2026-09-26）:
 * 路線チップ（単一選択・横スクロール 1 行）と、時計＋時刻の操作（現在時刻/時刻指定・表示時刻・ダイヤ）。
 * 現在時刻では今日のダイヤに固定されるので、ダイヤは選択欄ではなく字で示す。
 */
@Component({
    selector: 'app-train-location-controller',
    templateUrl: './train-location-controller.component.html',
    styleUrl: './train-location-controller.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatFormFieldModule,
        MatSelectModule,
        DateFnsPipe,
        MatInputModule,
        FormsModule,
        FilterChipsComponent,
        SegmentToggleComponent,
    ],
})
export class TrainLocationControllerComponent {
    /** 現在時刻/時刻指定 全幅2セグメントトグルの選択肢（98 G0-3・mockup-09） */
    readonly modeOptions: readonly [SegmentToggleOption, SegmentToggleOption] =
        [
            { value: 'now', label: '現在時刻' },
            { value: 'specified', label: '時刻指定' },
        ];

    readonly #calendarListStateQuery = inject(CalendarListStateQuery);
    readonly #routeStationListStateQuery = inject(RouteStationListStateQuery);
    readonly #agencyListStateQuery = inject(AgencyListStateQuery);

    readonly calendarId = input<string | null>(null);
    readonly selectedRouteId = input<string | null>(null);
    readonly mode = input<TrainLocationMode>('now');
    readonly clockText = input<string>('--:--:--');
    readonly timeInputValue = input<string>('00:00');

    readonly calendarIdChange = output<string>();
    readonly routeIdChange = output<string>();
    readonly modeChange = output<TrainLocationMode>();
    readonly timeInputValueChange = output<string>();

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

    readonly #agencyNameById = computed(
        () =>
            new Map(
                this.agencies().map((agency) => [
                    agency.agencyId,
                    agency.agencyName,
                ]),
            ),
    );

    readonly routeOptions = computed<FilterChipOption[]>(() => {
        const agencyNameById = this.#agencyNameById();
        // 会社のまとまりは会社チップと同じ「相鉄と直通を始めた順」（会社の中は系統順のまま）
        return sortByThroughServiceAgency(
            this.routes(),
            (route) => route.agencyId,
            this.agencies(),
        ).map((route) => ({
            value: route.routeId,
            label: route.routeName ?? '',
            // 会社名でグルーピング表示する（相鉄 / JR東日本 / 東急 …）
            group: route.agencyId
                ? agencyNameById.get(route.agencyId)
                : undefined,
        }));
    });
    readonly selectedRouteIdValue = computed<FilterChipValue[]>(() => {
        const id = this.selectedRouteId();
        return id ? [id] : [];
    });

    /** 現在時刻のときに字で示すダイヤ（例 2026/3/14改正 土休日） */
    readonly calendarLabel = computed(() => {
        const calendar = this.calendars().find(
            (c) => c.calendarId === this.calendarId(),
        );
        return calendar ? formatCalendarSummaryLabel(calendar) : '';
    });

    onCalendarChange(calendarId: string): void {
        this.calendarIdChange.emit(calendarId);
    }

    onModeChange(mode: FilterChipValue): void {
        this.modeChange.emit(mode as TrainLocationMode);
    }

    onTimeInputChange(value: string): void {
        this.timeInputValueChange.emit(value);
    }

    /** 時刻の選択画面を開く。`showPicker()` が無い・開けないブラウザでは何もしない */
    openTimePicker(input: HTMLInputElement): void {
        if (typeof input.showPicker !== 'function') return;
        try {
            input.showPicker();
        } catch {
            // 既に開いている・押した操作の外から呼ばれたなど。開けなくても入力はできる
        }
    }

    onRouteChange(values: FilterChipValue[]): void {
        const routeId = values[0];
        if (routeId !== undefined) {
            this.routeIdChange.emit(String(routeId));
        }
    }
}
