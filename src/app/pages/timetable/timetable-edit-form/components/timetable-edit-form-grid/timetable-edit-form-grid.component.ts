import {
    ChangeDetectionStrategy,
    Component,
    computed,
    effect,
    ElementRef,
    inject,
    input,
    output,
    signal,
} from '@angular/core';
import { FormArray, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { merge } from 'rxjs';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { tripDirectionLabel } from 'src/app/libs/trip/special/constants/trip.constant';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';
import {
    ITimetableEditFormGridCell,
    ITimetableEditFormGridTimeCell,
    ITimetableEditFormGridTripView,
    ITimetableEditFormTrip,
    ITimetableEditFormTripTime,
    TimetableEditFormTimeField,
} from '../../interfaces/timetable-edit-form.interface';
import { ETimetableEditFormStopType } from '../../special/enums/timetable-edit-form.enum';
import {
    findEndpointIndexes,
    findTimeOrderErrors,
    nextStopType,
    timetableEditFormStopTypeMark,
    timetableEditFormTimeFieldLabel,
} from '../../utils/timetable-edit-form-grid.util';
import {
    buildRouteReachability,
    findRouteErrors,
} from '../../utils/timetable-edit-form-route.util';
import {
    normalizeTimeDigits,
    toEditDigits,
} from '../../utils/timetable-edit-form-time-input.util';

/** キーと移動量（行, 欄） */
const GRID_MOVES: Readonly<Record<string, readonly [number, number]>> = {
    ArrowUp: [-1, 0],
    ArrowDown: [1, 0],
    Enter: [1, 0],
    ArrowLeft: [0, -1],
    ArrowRight: [0, 1],
};

/**
 * 列車情報の時刻の格子。Material 部品の例外（docs/design.md「入力の格子」）。
 * 打ち込みの速さと重さのため、時刻と停車種別のセルは素の input / button で組む。
 * 値は親の Reactive Forms（tripsForm）にそのまま結ぶ。
 */
@Component({
    selector: 'app-timetable-edit-form-grid',
    templateUrl: './timetable-edit-form-grid.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'tw-block' },
    imports: [
        ReactiveFormsModule,
        MatButtonModule,
        MatCheckboxModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatSelectModule,
    ],
})
export class TimetableEditFormGridComponent {
    readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

    readonly tripsForm = input.required<FormArray<ITimetableEditFormTrip>>();
    readonly stations = input.required<StationDetailsDto[]>();
    readonly visibleStations = input.required<StationDetailsDto[]>();
    readonly tripIndexes = input.required<number[]>();
    readonly compact = input<boolean>(false);
    readonly operations = input<OperationDetailsDto[]>([]);
    readonly tripClasses = input<TripClassDetailsDto[]>([]);

    readonly addTrip = output<void>();
    readonly removeTrip = output<number>();

    readonly stopTypeEnum = ETimetableEditFormStopType;

    /** フォームの値・状態が変わるたびに進める（computed の再計算の合図） */
    readonly #revision = signal(0);

    /**
     * フォーカスのある行（列車・駅）。始発の着・終着の発はこの行の間だけ打てる。
     * 上から順に打つと最後に打った駅が毎回終着になり、その発が打てなくなるため
     */
    readonly #activeRow = signal<{
        tripIndex: number;
        timeIndex: number;
    } | null>(null);

    readonly rowHeightClass = computed(() =>
        this.compact() ? 'tw-h-10' : 'tw-h-7',
    );

    readonly #stationIndexes = computed(
        () => new Map(this.stations().map((s, i) => [s.stationId, i])),
    );

    readonly #canReach = computed(() =>
        buildRouteReachability(this.stations()),
    );

    readonly #tripClassMap = computed(
        () => new Map(this.tripClasses().map((tc) => [tc.tripClassId, tc])),
    );

    readonly tripViews = computed<ITimetableEditFormGridTripView[]>(() => {
        this.#revision();
        this.#activeRow();
        const form = this.tripsForm();
        const stations = this.stations();

        return form.controls.map((tripForm, tripIndex) =>
            this.#buildTripView(tripForm, tripIndex, stations),
        );
    });

    readonly columns = computed(() => {
        const views = this.tripViews();
        // 駅が差し替わった直後は、フォームが作り直されるまで描かない
        const stationCount = this.stations().length;
        return this.tripIndexes()
            .map((i) => views[i])
            .filter(
                (view) =>
                    !!view &&
                    (view.tripForm.get('times') as FormArray).length ===
                        stationCount,
            );
    });

    readonly messages = computed(() =>
        this.tripViews().flatMap((view) => view.messages),
    );

    constructor() {
        effect((onCleanup) => {
            const form = this.tripsForm();
            const subscription = merge(
                form.valueChanges,
                form.statusChanges,
            ).subscribe(() => this.#revision.update((v) => v + 1));
            this.#revision.update((v) => v + 1);
            onCleanup(() => subscription.unsubscribe());
        });
    }

    onToggleStopType(
        tripForm: ITimetableEditFormTrip,
        timeIndex: number,
    ): void {
        const control = this.#timeForm(tripForm, timeIndex).get('stopType');
        control.markAsDirty();
        control.setValue(nextStopType(control.value));
    }

    onRowFocus(tripIndex: number, timeIndex: number): void {
        this.#activeRow.set({ tripIndex, timeIndex });
    }

    onRowBlur(): void {
        // 行の中で欄を移るときは blur の直後に focus が来て入れ直す
        this.#activeRow.set(null);
    }

    onTimeFocus(event: FocusEvent, tripIndex: number, timeIndex: number): void {
        this.onRowFocus(tripIndex, timeIndex);
        const el = event.target as HTMLInputElement;
        el.value = toEditDigits(el.value);
        el.select();
    }

    onTimeInput(event: Event): void {
        const el = event.target as HTMLInputElement;
        el.value = el.value.replace(/\D/g, '').slice(0, 4);
    }

    onTimeBlur(
        event: FocusEvent,
        tripForm: ITimetableEditFormTrip,
        timeIndex: number,
        field: TimetableEditFormTimeField,
        shown: string | null,
    ): void {
        this.onRowBlur();
        const el = event.target as HTMLInputElement;
        const timeForm = this.#timeForm(tripForm, timeIndex);
        const control = timeForm.get(field);
        const next = normalizeTimeDigits(el.value);

        if (next === undefined) {
            // 灰色のセルの control には保存で捨てる古い値が残りうるので、見えていた値に戻す
            el.value = shown ?? '';
            return;
        }

        el.value = next ?? '';

        // ‖ の駅に時刻を打つと停にする。‖ の control には保存で捨てられる古い値が
        // 残っていることがあるので、値の比較より先に判定する
        const stopType = timeForm.get('stopType');
        if (
            next !== null &&
            stopType.value === ETimetableEditFormStopType.NOT_GOING_THROUGH
        ) {
            stopType.markAsDirty();
            stopType.setValue(ETimetableEditFormStopType.STOP);
        }

        if (next === (control.value || null)) return;

        // 下書き保存は form.dirty のときだけ走るので、setValue より先に dirty にする
        control.markAsDirty();
        control.setValue(next);
    }

    onGridKeydown(event: KeyboardEvent): void {
        const el = event.target as HTMLElement;
        const move = GRID_MOVES[event.key];
        if (!move || el.dataset['row'] === undefined) return;

        event.preventDefault();
        let row = Number(el.dataset['row']);
        let col = Number(el.dataset['col']);

        for (;;) {
            row += move[0];
            col += move[1];
            const next = this.#host.nativeElement.querySelector<
                HTMLInputElement | HTMLButtonElement
            >(`[data-row="${row}"][data-col="${col}"]`);
            if (!next) return;
            if (!next.disabled) {
                next.focus();
                return;
            }
        }
    }

    #timeForm(
        tripForm: ITimetableEditFormTrip,
        timeIndex: number,
    ): ITimetableEditFormTripTime {
        return (
            tripForm.get('times') as FormArray<ITimetableEditFormTripTime>
        ).at(timeIndex);
    }

    #buildTripView(
        tripForm: ITimetableEditFormTrip,
        tripIndex: number,
        stations: StationDetailsDto[],
    ): ITimetableEditFormGridTripView {
        const timesForm = tripForm.get(
            'times',
        ) as FormArray<ITimetableEditFormTripTime>;
        const times = timesForm.getRawValue();
        const tripNumber =
            tripForm.get('tripNumber').value || `${tripIndex + 1}本目`;
        const { first, last } = findEndpointIndexes(times);
        const disablesEndpoints = first !== last;
        const errors = findTimeOrderErrors(times);
        const errorKeys = new Set(errors.map((e) => `${e.index}:${e.field}`));
        const routeErrors = findRouteErrors(times, this.#canReach());
        const routeErrorIndexes = new Set(
            routeErrors.flatMap((e) => [e.index, e.prevIndex]),
        );
        const active = this.#activeRow();
        const activeTimeIndex =
            active?.tripIndex === tripIndex ? active.timeIndex : null;
        const stationIndexes = this.#stationIndexes();

        const cells = this.visibleStations()
            .map((station) => {
                const timeIndex = stationIndexes.get(station.stationId);
                const time = times[timeIndex];
                if (!time) return null;

                const notGoing =
                    time.stopType ===
                    ETimetableEditFormStopType.NOT_GOING_THROUGH;
                const mark = timetableEditFormStopTypeMark.get(time.stopType);
                const timeCell = (
                    field: TimetableEditFormTimeField,
                    endpointIndex: number | null,
                ): ITimetableEditFormGridTimeCell => {
                    const disabled =
                        disablesEndpoints &&
                        timeIndex === endpointIndex &&
                        timeIndex !== activeTimeIndex;
                    const muted = disabled || notGoing;
                    return {
                        value: muted ? null : (time[field] ?? ''),
                        disabled,
                        muted,
                        error: errorKeys.has(`${timeIndex}:${field}`),
                        label: `${tripNumber} ${station.stationName} ${timetableEditFormTimeFieldLabel.get(field)}`,
                    };
                };

                return {
                    timeIndex,
                    stopType: time.stopType,
                    mark,
                    label: `${tripNumber} ${station.stationName} 停車種別 ${mark}`,
                    routeError: routeErrorIndexes.has(timeIndex),
                    arrivalTime: timeCell('arrivalTime', first),
                    departureTime: timeCell('departureTime', last),
                } satisfies ITimetableEditFormGridCell;
            })
            .filter((cell): cell is ITimetableEditFormGridCell => !!cell);

        const messages = errors.map(
            (e) =>
                `${tripNumber}: ${stations[e.index]?.stationName}の${timetableEditFormTimeFieldLabel.get(e.field)}（${e.time}）が${stations[e.prevIndex]?.stationName}（${e.prevTime}）より早い`,
        );
        const direction = tripDirectionLabel.get(
            tripForm.get('tripDirection').value,
        );
        messages.push(
            ...routeErrors.map(
                (e) =>
                    `${tripNumber}: ${stations[e.prevIndex]?.stationName}から${stations[e.index]?.stationName}へは${direction}で行けない（分岐をまたいでいる）`,
            ),
        );
        if (
            timesForm.dirty &&
            timesForm.hasError(
                'stopsStationCountShouldBeGreaterAndEqualThanTwo',
            )
        ) {
            messages.push(`${tripNumber}: 停車駅が 2 つ以上必要`);
        }

        return {
            tripIndex,
            tripForm,
            tripNumber,
            destination:
                last === null ? '' : (stations[last]?.stationName ?? ''),
            tripClass: this.#tripClassMap().get(
                tripForm.get('tripClassId').value,
            ),
            cells,
            messages,
        };
    }
}
