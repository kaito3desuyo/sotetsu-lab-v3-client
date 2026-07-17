import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    computed,
    effect,
    inject,
    input,
    output,
    signal,
} from '@angular/core';
import {
    FormArray,
    FormBuilder,
    FormsModule,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import {
    MatSlideToggleChange,
    MatSlideToggleModule,
} from '@angular/material/slide-toggle';
import { plainToClass } from 'class-transformer';
import dayjs from 'dayjs';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { classTransformerOptions } from 'src/app/core/configs/class-transformer';
import { PipesModule } from 'src/app/core/pipes/pipes.module';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { RouteDetailsDto } from 'src/app/libs/route/usecase/dtos/route-details.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripBlockDetailsDto } from 'src/app/libs/trip-block/usecase/dtos/trip-block-details.dto';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';
import { tripDirectionLabel } from 'src/app/libs/trip/special/constants/trip.constant';
import { ETripDirection } from 'src/app/libs/trip/special/enums/trip.enum';
import { CreateTripDto } from 'src/app/libs/trip/usecase/dtos/create-trip.dto';
import { ReplaceTripDto } from 'src/app/libs/trip/usecase/dtos/replace-trip.dto';
import { TimeDetailsDto } from 'src/app/libs/trip/usecase/dtos/time-details.dto';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';
import { AppButtonComponent } from 'src/app/shared/app-button/app-button.component';
import { CollapsiblePanelComponent } from 'src/app/shared/collapsible-panel/collapsible-panel.component';
import {
    FilterChipOption,
    FilterChipValue,
} from 'src/app/shared/filter-chips/filter-chip-option.type';
import { FilterChipsComponent } from 'src/app/shared/filter-chips/filter-chips.component';
import {
    ITimetableEditForm,
    ITimetableEditFormTrip,
    ITimetableEditFormTripTime,
} from '../../interfaces/timetable-edit-form.interface';
import { timetableEditFormStopTypeLabel } from '../../special/constants/timetable-edit-form.constants';
import {
    ETimetableEditFormMode,
    ETimetableEditFormStopType,
} from '../../special/enums/timetable-edit-form.enum';
import { offsetTimeString } from '../../utils/timetable-edit-form-offset.util';
import { TimetableEditFormValidator } from '../../validators/timetable-edit-form.validator';

@Component({
    selector: 'app-timetable-edit-form-trips',
    templateUrl: './timetable-edit-form-trips.component.html',
    styleUrls: ['./timetable-edit-form-trips.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        FormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatCheckboxModule,
        MatRadioModule,
        MatButtonModule,
        MatMenuModule,
        MatSlideToggleModule,
        MatIconModule,
        MatChipsModule,
        PipesModule,
        FilterChipsComponent,
        CollapsiblePanelComponent,
        AppButtonComponent,
    ],
})
export class TimetableEditFormTripsComponent {
    readonly #cd = inject(ChangeDetectorRef);
    readonly #fb = inject(FormBuilder);

    readonly modeEnum = ETimetableEditFormMode;
    readonly tripDirectionEnum = ETripDirection;
    readonly tripDirectionLabel = tripDirectionLabel;
    readonly stopTypeArray = Object.entries(ETimetableEditFormStopType).map(
        ([key, value]) => ({
            key,
            value,
            label: timetableEditFormStopTypeLabel.get(value),
        }),
    );

    readonly form: ITimetableEditForm = this.#fb.group({
        trips: this.#fb.array<ITimetableEditFormTrip>([]),
    });

    get tripsForm(): FormArray<ITimetableEditFormTrip> {
        return this.form.get('trips') as FormArray<ITimetableEditFormTrip>;
    }

    readonly #unsubscriber$ = new Subject<number>();

    readonly serviceId = input.required<string>();
    readonly calendarId = input.required<string>();
    readonly calendar = input<CalendarDetailsDto | null>(null);
    readonly mode = input.required<ETimetableEditFormMode>();
    readonly tripDirection = input<ETripDirection | null>(null);
    readonly stations = input.required<StationDetailsDto[]>();
    readonly visibleStationIds = input<string[]>([]);
    readonly routes = input<RouteDetailsDto[]>([]);
    readonly selectedRouteIds = input<string[]>([]);
    readonly operations = input.required<OperationDetailsDto[]>();
    readonly tripClasses = input.required<TripClassDetailsDto[]>();
    readonly trips = input<TripDetailsDto[]>([]);
    readonly copySourceCandidates = input<TripBlockDetailsDto[]>([]);
    readonly selectedTripBlockId = input<string | null>(null);
    readonly lastSubmittedAt = input<number | null>(null);
    readonly restoreTrips = input<TripDetailsDto[] | null>(null);

    readonly clickSubmit = output<CreateTripDto[] | ReplaceTripDto[]>();
    readonly toggleIsSaveTripsIndividually = output<MatSlideToggleChange>();
    readonly selectedRouteIdsChange = output<FilterChipValue[]>();
    readonly selectCopySource = output<string>();
    readonly formValueChange = output<unknown[]>();
    readonly restored = output<void>();
    /** G9: sticky 下部バーの「下書き保存」明示クリック（自動保存に加えてユーザーへの確認手段） */
    readonly saveDraftClick = output<void>();

    readonly offsetMinutes = signal<number>(0);
    readonly currentTripIndex = signal<number>(0);

    readonly visibleStations = computed(() => {
        const visibleIds = new Set(this.visibleStationIds());
        return this.stations().filter((s) => visibleIds.has(s.stationId));
    });

    readonly routeOptions = computed<FilterChipOption[]>(() =>
        this.routes().map((route) => ({
            value: route.routeId,
            label: route.routeName ?? route.routeNickName ?? route.routeId,
            color: route.routeColor ?? undefined,
        })),
    );

    readonly copySourceOptions = computed(() => this.copySourceCandidates());

    readonly isHolidayCalendar = computed(() => {
        const calendar = this.calendar();
        return !!calendar && (calendar.sunday || calendar.saturday);
    });

    readonly isVisibleToggleThatSaveTripsIndividually = computed(() => {
        const mode = this.mode();
        return mode !== ETimetableEditFormMode.UPDATE;
    });

    readonly isCopyMode = computed(
        () => this.mode() === ETimetableEditFormMode.COPY,
    );

    /**
     * G9: 初期値取り込みブロック（既存列車からコピー + 一括オフセット）の表示可否。
     * mock06「列車情報入力（新規）」は新規（ADD）画面でこのブロックを常時表示するため、
     * COPY 限定ではなく UPDATE 以外（ADD/COPY）で表示する。
     */
    readonly isInitialValueBlockVisible = computed(
        () => this.mode() !== ETimetableEditFormMode.UPDATE,
    );

    /** G9: sticky 下部バー「この列車を登録/更新」のモード別ラベル */
    readonly submitButtonLabel = computed(() =>
        this.mode() === ETimetableEditFormMode.UPDATE
            ? 'この列車を更新'
            : 'この列車を登録',
    );

    /** G9: 路線チップ折り畳み時のヘッダー要約（保守的既定=全路線は「全路線」と表示） */
    readonly routeFilterSummary = computed(() => {
        const options = this.routeOptions();
        const selected = this.selectedRouteIds();
        if (
            !options.length ||
            selected.length === 0 ||
            selected.length === options.length
        ) {
            return '全路線';
        }
        const selectedSet = new Set<FilterChipValue>(selected);
        return options
            .filter((o) => selectedSet.has(o.value))
            .map((o) => o.label)
            .join('、');
    });

    /** G9: 初期値取り込みブロックのプリフィル説明行に使うコピー元ラベル */
    readonly selectedCopySourceLabel = computed(() => {
        const blockId = this.selectedTripBlockId();
        if (!blockId) return null;

        const block = this.copySourceOptions().find(
            (o) => o.tripBlockId === blockId,
        );
        return block ? this.tripBlockLabel(block) : null;
    });

    constructor() {
        effect(() => {
            // 依存トラッキングのため必ず読む
            this.serviceId();
            this.calendarId();
            this.mode();
            this.tripDirection();
            this.stations();
            this.trips();

            this.#formInitialize();
        });

        effect(() => {
            const submittedAt = this.lastSubmittedAt();
            if (submittedAt === null || submittedAt === undefined) return;

            if (this.mode() !== ETimetableEditFormMode.UPDATE) {
                this.#formInitialize();
            }
        });

        effect(() => {
            const trips = this.restoreTrips();
            if (!trips) return;

            this.#loadTrips(trips);
            this.currentTripIndex.set(0);
            this.restored.emit();
        });

        this.form.valueChanges.subscribe(() => {
            if (!this.form.dirty) return;
            this.formValueChange.emit(this.tripsForm.getRawValue());
        });
    }

    onRouteFilterChange(values: FilterChipValue[]): void {
        this.selectedRouteIdsChange.emit(values);
    }

    tripBlockLabel(block: TripBlockDetailsDto): string {
        return (
            block.trips?.map((t) => t.tripNumber)?.join(' → ') ?? ''
        );
    }

    onCopySourceChange(tripBlockId: string): void {
        this.selectCopySource.emit(tripBlockId);
    }

    onApplyOffset(): void {
        const minutes = this.offsetMinutes();
        if (!minutes) return;

        for (const tripForm of this.tripsForm.controls) {
            const timesForm = tripForm.get(
                'times',
            ) as FormArray<ITimetableEditFormTripTime>;

            for (const timeForm of timesForm.controls) {
                const arrivalTime = timeForm.get('arrivalTime').value;
                const departureTime = timeForm.get('departureTime').value;

                timeForm.patchValue({
                    arrivalTime: offsetTimeString(arrivalTime, minutes),
                    departureTime: offsetTimeString(departureTime, minutes),
                });
            }
        }

        this.form.markAsDirty();
    }

    onPrevTrip(): void {
        this.currentTripIndex.update((i) => Math.max(0, i - 1));
    }

    onNextTrip(): void {
        this.currentTripIndex.update((i) =>
            Math.min(this.tripsForm.controls.length - 1, i + 1),
        );
    }

    /**
     * G9: 2×2 ヘッダーの種別バッジ用。tripClassId から色・名称を引く
     * （tripClassColor は UI ハードコードしない）。
     */
    selectedTripClass(
        tripForm: ITimetableEditFormTrip,
    ): TripClassDetailsDto | undefined {
        const tripClassId = tripForm.get('tripClassId').value;
        return this.tripClasses().find(
            (tripClass) => tripClass.tripClassId === tripClassId,
        );
    }

    /**
     * G9: 「行先」は API に保存する独立フィールドではなく、times の中で
     * 最後に停車/通過する駅名から導出する読み取り専用の表示値
     * （保存 API のペイロード契約は変更しない）。
     */
    destinationLabel(tripForm: ITimetableEditFormTrip): string {
        const timesForm = tripForm.get(
            'times',
        ) as FormArray<ITimetableEditFormTripTime>;
        const stations = this.stations();

        let lastStationId: string | null = null;
        for (const timeForm of timesForm.controls) {
            if (
                timeForm.get('stopType').value !==
                ETimetableEditFormStopType.NOT_GOING_THROUGH
            ) {
                lastStationId = timeForm.get('stationId').value;
            }
        }

        if (!lastStationId) return '';

        return (
            stations.find((s) => s.stationId === lastStationId)
                ?.stationName ?? ''
        );
    }

    isPassStopType(timeForm: ITimetableEditFormTripTime): boolean {
        return (
            timeForm.get('stopType').value ===
            ETimetableEditFormStopType.PASS
        );
    }

    /**
     * G9: モバイルの1駅1行リストでは「経由なし」ラジオを廃止し（路線チップ
     * 絞り込みが代替する）、停/通のコンパクトな2値切替のみをタップで循環させる。
     * 既存の停/通判定・活性/非活性ロジック（#changeDisabledStateWhenChangeStopType）
     * はデスクトップと共有のため変更しない。
     */
    onToggleStopType(timeForm: ITimetableEditFormTripTime): void {
        const control = timeForm.get('stopType');
        const next =
            control.value === ETimetableEditFormStopType.STOP
                ? ETimetableEditFormStopType.PASS
                : ETimetableEditFormStopType.STOP;

        control.setValue(next);
        control.markAsDirty();
        this.form.markAsDirty();
    }

    /** G9: sticky 下部バー「下書き保存」。自動保存（valueChanges 購読）に加え明示トリガーを提供する。 */
    onClickSaveDraft(): void {
        this.formValueChange.emit(this.tripsForm.getRawValue());
        this.saveDraftClick.emit();
    }

    #loadTrips(trips: TripDetailsDto[]): void {
        this.#clearTripsForm();

        for (const trip of trips) {
            this.#add(trip);
        }

        this.#cd.markForCheck();
    }

    #generateTripFormGroup(trip?: TripDetailsDto): ITimetableEditFormTrip {
        const stations = this.stations();

        if (trip) {
            return this.#fb.group({
                tripId: [trip.tripId],
                serviceId: [this.serviceId(), [Validators.required]],
                tripNumber: [trip.tripNumber, []],
                tripClassId: [trip.tripClassId, [Validators.required]],
                tripName: [''],
                tripDirection: [this.tripDirection(), [Validators.required]],
                tripBlockId: [trip.tripBlockId],
                depotIn: [trip.depotIn],
                depotOut: [trip.depotOut],
                calendarId: [this.calendarId(), [Validators.required]],
                extraCalendarId: [null],
                times: this.#fb.array(
                    stations.map((station) =>
                        this.#generateTripTimeFormGroup(
                            station,
                            trip.times?.find(
                                (o) => o.stationId === station.stationId,
                            ),
                        ),
                    ),
                    [
                        TimetableEditFormValidator.stopsStationCountShouldBeGreaterAndEqualThanTwo,
                        TimetableEditFormValidator.stopTimesShouldBeLaterThanPrevStopTimes,
                    ],
                ),
                operationId: [
                    this.mode() === ETimetableEditFormMode.UPDATE &&
                    trip.tripOperationLists?.length
                        ? trip.tripOperationLists[0].operationId
                        : '',
                ],
            });
        }

        return this.#fb.group({
            tripId: [null],
            serviceId: [this.serviceId(), [Validators.required]],
            tripNumber: ['', []],
            tripClassId: ['', [Validators.required]],
            tripName: [''],
            tripDirection: [this.tripDirection(), [Validators.required]],
            tripBlockId: [null],
            depotIn: [false],
            depotOut: [false],
            calendarId: [this.calendarId(), [Validators.required]],
            extraCalendarId: [null],
            times: this.#fb.array(
                stations.map((station) =>
                    this.#generateTripTimeFormGroup(station),
                ),
                [
                    TimetableEditFormValidator.stopsStationCountShouldBeGreaterAndEqualThanTwo,
                    TimetableEditFormValidator.stopTimesShouldBeLaterThanPrevStopTimes,
                ],
            ),
            operationId: [''],
        });
    }

    #generateTripTimeFormGroup(
        station: StationDetailsDto,
        time?: TimeDetailsDto,
    ): ITimetableEditFormTripTime {
        if (time) {
            return this.#fb.group({
                timeId: [time.timeId],
                tripId: [time.tripId],
                stationId: [station.stationId, [Validators.required]],
                stopId: [time.stopId],
                stopType: [
                    (time.pickupType === 1 && time.dropoffType === 1
                        ? ETimetableEditFormStopType.PASS
                        : ETimetableEditFormStopType.STOP) as ETimetableEditFormStopType,
                ],
                arrivalTime: [
                    time.arrivalTime
                        ? dayjs(time.arrivalTime, 'HH:mm:ss').format('HH:mm')
                        : null,
                ],
                departureTime: [
                    time.departureTime
                        ? dayjs(time.departureTime, 'HH:mm:ss').format(
                              'HH:mm',
                          )
                        : null,
                ],
            });
        }

        return this.#fb.group({
            timeId: [null],
            tripId: [null],
            stationId: [station.stationId, [Validators.required]],
            stopId: [null],
            stopType: [
                ETimetableEditFormStopType.NOT_GOING_THROUGH as ETimetableEditFormStopType,
            ],
            arrivalTime: [null],
            departureTime: [null],
        });
    }

    #changeDisabledStateWhenChangeStopType(
        tripTimesForm: FormArray<ITimetableEditFormTripTime>,
        unsubscribeIndex: number,
    ): void {
        const changeDisabledState = (
            stopType: ETimetableEditFormStopType,
            form: ITimetableEditFormTripTime,
        ) => {
            switch (stopType) {
                case ETimetableEditFormStopType.STOP:
                case ETimetableEditFormStopType.PASS:
                    form.get('stopId').enable();
                    form.get('arrivalTime').enable();
                    form.get('departureTime').enable();
                    return;
                case ETimetableEditFormStopType.NOT_GOING_THROUGH:
                    form.get('stopId').disable();
                    form.get('arrivalTime').disable();
                    form.get('departureTime').disable();
                    return;
            }
        };

        for (const form of tripTimesForm.controls) {
            changeDisabledState(form.get('stopType').value, form);

            form.get('stopType')
                .valueChanges.pipe(
                    takeUntil(
                        this.#unsubscriber$.pipe(
                            filter((index) => index === unsubscribeIndex),
                        ),
                    ),
                )
                .subscribe((stopType) => {
                    changeDisabledState(stopType, form);
                });
        }
    }

    #add(trip?: TripDetailsDto): void {
        const tripsForm = this.form.get(
            'trips',
        ) as FormArray<ITimetableEditFormTrip>;
        const newTripForm = this.#generateTripFormGroup(trip);

        this.#changeDisabledStateWhenChangeStopType(
            newTripForm.get('times') as FormArray<ITimetableEditFormTripTime>,
            tripsForm.controls.length,
        );

        tripsForm.push(newTripForm);
    }

    #remove(index: number): void {
        const tripsForm = this.form.get(
            'trips',
        ) as FormArray<ITimetableEditFormTrip>;

        tripsForm.removeAt(index);

        if (this.currentTripIndex() >= tripsForm.controls.length) {
            this.currentTripIndex.set(
                Math.max(0, tripsForm.controls.length - 1),
            );
        }
    }

    #clearTripsForm(): void {
        const tripsForm = this.form.get(
            'trips',
        ) as FormArray<ITimetableEditFormTrip>;

        for (let index = 0; index < tripsForm.controls.length; index++) {
            this.#unsubscriber$.next(index);
        }

        tripsForm.clear();
    }

    #formInitialize(): void {
        this.#clearTripsForm();

        // ADD/COPY/UPDATE いずれも、プリフィル対象 trips（COPY のコピー元、
        // UPDATE の編集対象、ADD で「既存列車からコピー」を選んだ場合の
        // コピー元）があれば読み込み、無ければ空の 1 件で初期化する。
        // ADD で copy 元未選択のときは従前どおり空 1 件になる。
        for (const trip of this.trips()) {
            this.#add(trip);
        }
        if (this.tripsForm.controls.length === 0) {
            this.#add();
        }

        this.currentTripIndex.set(0);
        this.#cd.markForCheck();
    }

    onClickAdd(): void {
        this.#add();
    }

    onClickRemove(index: number): void {
        this.#remove(index);
    }

    onClickClear(): void {
        this.#formInitialize();
    }

    onClickSubmit(): void {
        const tripsForm = this.form.get(
            'trips',
        ) as FormArray<ITimetableEditFormTrip>;

        const dto = tripsForm.value.map((trip) => {
            const times = trip.times.filter(
                (o) =>
                    o.stopType !== ETimetableEditFormStopType.NOT_GOING_THROUGH,
            );

            return plainToClass(
                this.mode() === ETimetableEditFormMode.UPDATE
                    ? ReplaceTripDto
                    : CreateTripDto,
                {
                    ...trip,
                    tripId: trip.tripId ?? undefined,
                    tripNumber: trip.tripNumber || '不明',
                    times: times.map((time, index, arr) => {
                        const arrivalTime =
                            time.arrivalTime && index !== 0
                                ? dayjs(time.arrivalTime, 'HH:mm')
                                : null;
                        const departureTime =
                            time.departureTime && index !== arr.length - 1
                                ? dayjs(time.departureTime, 'HH:mm')
                                : null;

                        return {
                            ...time,
                            timeId: time.timeId ?? undefined,
                            stopSequence: index + 1,
                            pickupType:
                                time.stopType ===
                                    ETimetableEditFormStopType.STOP &&
                                index !== arr.length - 1
                                    ? 0
                                    : 1,
                            dropoffType:
                                time.stopType ===
                                    ETimetableEditFormStopType.STOP &&
                                index !== 0
                                    ? 0
                                    : 1,
                            arrivalDays:
                                arrivalTime && index !== 0
                                    ? arrivalTime.hour() < 4
                                        ? 2
                                        : 1
                                    : null,
                            arrivalTime:
                                arrivalTime && index !== 0
                                    ? arrivalTime.format('HH:mm')
                                    : null,
                            departureDays:
                                departureTime && index !== arr.length - 1
                                    ? departureTime.hour() < 4
                                        ? 2
                                        : 1
                                    : null,
                            departureTime:
                                departureTime && index !== arr.length - 1
                                    ? departureTime.format('HH:mm')
                                    : null,
                        };
                    }),
                    tripOperationLists: trip.operationId
                        ? [
                              {
                                  operationId: trip.operationId,
                                  startStationId: times[0]?.stationId ?? null,
                                  endStationId:
                                      times[times.length - 1]?.stationId ??
                                      null,
                              },
                          ]
                        : [],
                },
                classTransformerOptions,
            );
        });

        this.clickSubmit.emit(dto);
    }
}
