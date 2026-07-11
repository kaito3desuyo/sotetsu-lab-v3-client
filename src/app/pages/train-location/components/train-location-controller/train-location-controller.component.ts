import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
    input,
    output,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { RouterLink } from '@angular/router';
import { DateFnsPipe } from 'src/app/core/pipes/dateFns.pipe';
import { formatCalendarSummaryLabel } from 'src/app/core/utils/format-calendar-summary-label.util';
import { AgencyListStateQuery } from 'src/app/global-states/agency-list.state';
import { CalendarListStateQuery } from 'src/app/global-states/calendar-list.state';
import { RouteStationListStateQuery } from 'src/app/global-states/route-station-list.state';
import { CollapsiblePanelComponent } from 'src/app/shared/collapsible-panel/collapsible-panel.component';
import {
    FilterChipOption,
    FilterChipValue,
} from 'src/app/shared/filter-chips/filter-chip-option.type';
import { FilterChipsComponent } from 'src/app/shared/filter-chips/filter-chips.component';
import { TrainLocationMode } from '../../stores/train-location.store';

/** 折り畳み時の要約に使う時刻モードの表示名 */
const MODE_LABELS: Record<TrainLocationMode, string> = {
    now: '現在時刻',
    specified: '時刻指定',
};

/**
 * N2 列車位置情報の操作部（5.8）: ダイヤ select + 現在時刻/時刻指定トグル + 路線チップ（単一選択）+ 免責表示。
 * ダイヤ select は現在時刻モードでは今日のダイヤに固定されるため無効化する（時刻指定モードのみ選択可）。
 */
@Component({
    selector: 'app-train-location-controller',
    templateUrl: './train-location-controller.component.html',
    styleUrl: './train-location-controller.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatFormFieldModule,
        MatSelectModule,
        MatButtonToggleModule,
        DateFnsPipe,
        FilterChipsComponent,
        RouterLink,
        CollapsiblePanelComponent,
    ],
})
export class TrainLocationControllerComponent {
    readonly #calendarListStateQuery = inject(CalendarListStateQuery);
    readonly #routeStationListStateQuery = inject(RouteStationListStateQuery);
    readonly #agencyListStateQuery = inject(AgencyListStateQuery);

    readonly calendarId = input<string | null>(null);
    readonly selectedRouteId = input<string | null>(null);
    readonly mode = input<TrainLocationMode>('now');

    readonly calendarIdChange = output<string>();
    readonly routeIdChange = output<string>();
    readonly modeChange = output<TrainLocationMode>();

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

    readonly isCalendarSelectDisabled = computed(() => this.mode() === 'now');

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
        return this.routes().map((route) => ({
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

    /**
     * 折り畳み時にヘッダーへ表示する現在の設定の要約
     * （時刻モード / 選択路線 / ダイヤ）。
     */
    readonly collapsedSummary = computed(() => {
        const calendar = this.calendars().find(
            (c) => c.calendarId === this.calendarId(),
        );
        const calendarLabel = calendar
            ? formatCalendarSummaryLabel(calendar)
            : 'ダイヤ未選択';

        const selectedRouteId = this.selectedRouteId();
        const routeLabel =
            this.routeOptions().find(
                (option) => String(option.value) === selectedRouteId,
            )?.label ?? '路線未選択';

        return [MODE_LABELS[this.mode()], routeLabel, calendarLabel].join(
            ' / ',
        );
    });

    onCalendarChange(calendarId: string): void {
        this.calendarIdChange.emit(calendarId);
    }

    onModeChange(mode: TrainLocationMode): void {
        this.modeChange.emit(mode);
    }

    onRouteChange(values: FilterChipValue[]): void {
        const routeId = values[0];
        if (routeId !== undefined) {
            this.routeIdChange.emit(String(routeId));
        }
    }
}
