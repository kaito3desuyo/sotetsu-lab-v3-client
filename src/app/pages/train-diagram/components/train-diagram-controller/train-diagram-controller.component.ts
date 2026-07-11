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
import {
    DIAGRAM_ZOOM_LEVELS,
    DiagramDirectionFilter,
    DiagramZoomLevel,
} from '../../stores/train-diagram.store';
import { generateDiagramWindowOptions } from '../../utils/generate-diagram-window-options.util';

/** 折り畳み時の要約に使う方向フィルタの表示名 */
const DIRECTION_FILTER_LABELS: Record<DiagramDirectionFilter, string> = {
    up: '上り',
    down: '下り',
    both: '上り・下り',
};

/** 折り畳み時の要約に使うズーム段階の表示名 */
const ZOOM_LEVEL_LABELS: Record<DiagramZoomLevel, string> = {
    narrow: '縮小',
    standard: '標準',
    wide: '拡大',
};

/**
 * N1 ダイヤグラムの操作部（5.7）: ダイヤ select + 時間帯 select + 路線チップ（複数選択・会社グルーピング）+ ズームボタン。
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
        DateFnsPipe,
        FilterChipsComponent,
        CollapsiblePanelComponent,
    ],
})
export class TrainDiagramControllerComponent {
    readonly #calendarListStateQuery = inject(CalendarListStateQuery);
    readonly #routeStationListStateQuery = inject(RouteStationListStateQuery);
    readonly #agencyListStateQuery = inject(AgencyListStateQuery);

    readonly calendarId = input<string | null>(null);
    readonly selectedRouteIds = input<string[]>([]);
    readonly windowStartHour = input<number>(7);
    readonly zoomLevel = input<DiagramZoomLevel>('standard');
    readonly directionFilter = input<DiagramDirectionFilter>('both');

    readonly calendarIdChange = output<string>();
    readonly routeIdsChange = output<string[]>();
    readonly windowStartHourChange = output<number>();
    readonly zoomLevelChange = output<DiagramZoomLevel>();
    readonly directionFilterChange = output<DiagramDirectionFilter>();

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

    readonly windowOptions = generateDiagramWindowOptions();
    readonly zoomLevels: DiagramZoomLevel[] = Object.keys(
        DIAGRAM_ZOOM_LEVELS,
    ) as DiagramZoomLevel[];

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

    /**
     * 折り畳み時にヘッダーへ表示する現在の設定の要約
     * （ダイヤ / 選択路線 / 時間帯 / 方向 / ズーム）。
     */
    readonly collapsedSummary = computed(() => {
        const calendar = this.calendars().find(
            (c) => c.calendarId === this.calendarId(),
        );
        const calendarLabel = calendar
            ? formatCalendarSummaryLabel(calendar)
            : 'ダイヤ未選択';

        const selectedIds = new Set(this.selectedRouteIds());
        const routeNames = this.routeOptions()
            .filter((option) => selectedIds.has(String(option.value)))
            .map((option) => option.label);
        const routeLabel = routeNames.length ? routeNames.join('・') : '全路線';

        const windowLabel =
            this.windowOptions.find(
                (option) => option.startHour === this.windowStartHour(),
            )?.label ?? '';

        return [
            calendarLabel,
            routeLabel,
            windowLabel,
            DIRECTION_FILTER_LABELS[this.directionFilter()],
            ZOOM_LEVEL_LABELS[this.zoomLevel()],
        ]
            .filter((part) => !!part)
            .join(' / ');
    });

    onCalendarChange(calendarId: string): void {
        this.calendarIdChange.emit(calendarId);
    }

    onWindowChange(value: string): void {
        const option = this.windowOptions.find((o) => o.value === value);
        if (option) {
            this.windowStartHourChange.emit(option.startHour);
        }
    }

    onRouteChange(values: FilterChipValue[]): void {
        this.routeIdsChange.emit(values.map((value) => String(value)));
    }

    onZoomChange(level: DiagramZoomLevel): void {
        this.zoomLevelChange.emit(level);
    }

    onDirectionFilterChange(directionFilter: DiagramDirectionFilter): void {
        this.directionFilterChange.emit(directionFilter);
    }

    currentWindowValue(): string {
        const option = this.windowOptions.find(
            (o) => o.startHour === this.windowStartHour(),
        );
        return option?.value ?? this.windowOptions[0].value;
    }
}
