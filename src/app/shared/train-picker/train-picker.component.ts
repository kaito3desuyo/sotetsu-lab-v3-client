import {
    afterRenderEffect,
    ChangeDetectionStrategy,
    Component,
    computed,
    ElementRef,
    inject,
    output,
    signal,
    viewChild,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { lastValueFrom } from 'rxjs';
import { AgencyListState } from 'src/app/global-states/agency-list.state';
import { TodaysListsRefresher } from 'src/app/global-states/todays-lists-refresher';
import { RouteStationListState } from 'src/app/global-states/route-station-list.state';
import { OperationNumberColorPipe } from 'src/app/core/pipes/operation-number-color.pipe';
import { AppButtonComponent } from '../app-button/app-button.component';
import { LazyOptionsDirective } from '../lazy-options/lazy-options.directive';
import { SegmentToggleComponent } from '../segment-toggle/segment-toggle.component';
import { SegmentToggleOption } from '../segment-toggle/segment-toggle-option.type';
import { buildStationGroups } from '../station-groups.util';
import { buildStationNameById } from '../station-name-by-id.util';
import { TripLabelComponent } from '../trip-label/trip-label.component';
import { buildPickableTrains } from './build-pickable-trains.util';
import { PickableTrain, PickerDirection } from './pickable-train.interface';
import { TrainPickerService } from './train-picker.service';
import { TrainPickerStore } from './train-picker.store';

/** 駅と時刻（開いた時刻の前後）から列車を選ぶ。選ぶと picked、戻ると cancelled を出す。 */
@Component({
    selector: 'app-train-picker',
    templateUrl: './train-picker.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatIconModule,
        MatProgressBarModule,
        MatSelectModule,
        AppButtonComponent,
        LazyOptionsDirective,
        SegmentToggleComponent,
        TripLabelComponent,
        OperationNumberColorPipe,
    ],
    providers: [TrainPickerService],
})
export class TrainPickerComponent {
    readonly #store = inject(TrainPickerStore);
    readonly #service = inject(TrainPickerService);
    readonly #listsRefresher = inject(TodaysListsRefresher);
    readonly #routeStations = inject(RouteStationListState).routeStations;
    readonly #agencies = inject(AgencyListState).agencies;

    readonly picked = output<PickableTrain>();
    readonly cancelled = output<void>();

    protected readonly store = this.#store;
    protected readonly trainList =
        viewChild<ElementRef<HTMLElement>>('trainList');
    /** 開いた時刻。1 分ごとの更新はしない。 */
    readonly #at = signal(new Date());

    protected readonly directionOptions: readonly SegmentToggleOption[] = [
        { value: 'both', label: '両方' },
        { value: 'inbound', label: '上り' },
        { value: 'outbound', label: '下り' },
    ];

    protected readonly stationGroups = computed(() =>
        buildStationGroups(this.#routeStations(), this.#agencies()),
    );
    protected readonly selectedStation = computed(() => {
        const stationId = this.#store.stationId();
        return stationId
            ? this.stationGroups()
                  .flatMap((group) => group.stations)
                  .find((station) => station.stationId === stationId)
            : undefined;
    });
    readonly #stationNameById = computed(() =>
        buildStationNameById(this.#routeStations()),
    );

    protected readonly trains = computed(() => {
        const stationId = this.#store.stationId();
        if (!stationId) {
            return [];
        }

        return buildPickableTrains({
            tripBlocks: this.#store.tripBlocks(),
            stationId,
            at: this.#at(),
            minutesBefore: this.#store.minutesBefore(),
            minutesAfter: this.#store.minutesAfter(),
            direction: this.#store.direction(),
            stationNameById: this.#stationNameById(),
        });
    });

    /** 最後にスクロールを合わせたときの駅・方向 */
    #scrolledKey: string | null = null;
    /** 最後にスクロールを合わせた一覧の枠（引き直しで作り直されたかの判定） */
    #scrolledList: HTMLElement | null = null;
    /** 引き直しの前に覚えておく、一覧のスクロール位置（同じ駅・方向なら戻す） */
    #savedScrollTop: number | null = null;

    constructor() {
        this.#store.resetWindow();
        void this.reload();

        // 今に一番近い行（過ぎていない最初の行。全部過ぎていれば最後の行）を一覧の枠の中で見える位置へ。
        // 初回と、駅・方向を変えたときだけ。もっと前・もっと後で窓を広げたときは動かさない。
        // scrollIntoView はダイアログやページまで動かすので、枠の scrollTop だけを動かす
        afterRenderEffect(() => {
            this.trains();
            const list = this.trainList()?.nativeElement;
            if (!list) return;
            const key = `${this.#store.stationId()}|${this.#store.direction()}`;
            if (key === this.#scrolledKey) {
                // 引き直し（ローディングで枠が作り直された）後は、覚えておいた位置へ戻す
                if (list !== this.#scrolledList) {
                    this.#scrolledList = list;
                    if (this.#savedScrollTop !== null) {
                        list.scrollTop = this.#savedScrollTop;
                        this.#savedScrollTop = null;
                    }
                }
                return;
            }
            this.#scrolledList = list;
            this.#scrolledKey = key;
            const rows = Array.from(
                list.querySelectorAll<HTMLElement>('[data-train-row]'),
            );
            const target =
                rows.find((row) => row.dataset['past'] !== 'true') ??
                rows[rows.length - 1];
            if (target) {
                list.scrollTop = target.offsetTop - list.offsetTop;
            }
        });
    }

    async reload(): Promise<void> {
        this.#at.set(new Date());
        this.#savedScrollTop =
            this.trainList()?.nativeElement.scrollTop ?? null;
        this.#store.enableLoading();
        try {
            // 4 時をまたいだら、前の営業日のダイヤで列車を取らないよう一覧を引き直す。
            // 引き直せなかったら古いダイヤで列車を並べず、読み込み失敗の表示にする
            if (
                this.#listsRefresher.isStale(this.#at()) &&
                !(await this.#listsRefresher.refreshIfStale(this.#at()))
            ) {
                this.#store.setFetchFailed(true);
                return;
            }
            await lastValueFrom(this.#service.fetchTripBlocks());
        } finally {
            this.#store.disableLoading();
        }
    }

    protected onStationChange(stationId: string): void {
        this.#store.setStationId(stationId);
    }

    protected onDirectionChange(value: unknown): void {
        this.#store.setDirection(value as PickerDirection);
    }
}
