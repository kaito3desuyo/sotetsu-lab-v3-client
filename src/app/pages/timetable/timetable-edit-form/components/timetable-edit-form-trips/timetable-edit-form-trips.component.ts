import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
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
import { toSignal } from '@angular/core/rxjs-interop';
import {
    FormArray,
    FormBuilder,
    FormsModule,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import {
    MatSlideToggleChange,
    MatSlideToggleModule,
} from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { plainToClass } from 'class-transformer';
import dayjs from 'dayjs';
import { map } from 'rxjs/operators';
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
import { CalendarBandComponent } from 'src/app/shared/calendar-band/calendar-band.component';
import { CollapsiblePanelComponent } from 'src/app/shared/collapsible-panel/collapsible-panel.component';
import {
    FilterChipOption,
    FilterChipValue,
} from 'src/app/shared/filter-chips/filter-chip-option.type';
import { FilterChipsComponent } from 'src/app/shared/filter-chips/filter-chips.component';
import {
    ITimetableEditForm,
    ITimetableEditFormTrip,
    ITimetableEditFormTripValue,
    ITimetableEditFormTripTime,
} from '../../interfaces/timetable-edit-form.interface';
import {
    ETimetableEditFormMode,
    ETimetableEditFormStopType,
} from '../../special/enums/timetable-edit-form.enum';
import {
    buildCopySourceGroups,
    filterCopySourceGroups,
} from '../../utils/timetable-edit-form-copy-source.util';
import { offsetTimeString } from '../../utils/timetable-edit-form-offset.util';
import { TimetableEditFormValidator } from '../../validators/timetable-edit-form.validator';
import { TimetableEditFormGridComponent } from '../timetable-edit-form-grid/timetable-edit-form-grid.component';

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
        MatButtonModule,
        MatAutocompleteModule,
        MatSlideToggleModule,
        MatTooltipModule,
        MatIconModule,
        PipesModule,
        FilterChipsComponent,
        CollapsiblePanelComponent,
        AppButtonComponent,
        CalendarBandComponent,
        TimetableEditFormGridComponent,
    ],
})
export class TimetableEditFormTripsComponent {
    readonly #cd = inject(ChangeDetectorRef);
    readonly #fb = inject(FormBuilder);
    readonly #breakpointObserver = inject(BreakpointObserver);

    readonly modeEnum = ETimetableEditFormMode;
    readonly tripDirectionEnum = ETripDirection;
    readonly tripDirectionLabel = tripDirectionLabel;

    /** 列車個別保存モードの説明の全文（ⓘ のツールチップ。以前の 4 行の説明を削らずに移した） */
    readonly saveTripsIndividuallyHelp =
        '既定では、複数入力した列車を分割・併合・直通のある列車群として 1 つのグループに割り当てます。' +
        '途中駅で方向は変わらず、列車番号や種別が変わる場合に使います。' +
        '分割・併合・直通のない列車を複数同時に保存する（グループを作らず、列車ごとに 1 つのグループを割り当てる）場合は ON にします。';

    readonly form: ITimetableEditForm = this.#fb.group({
        trips: this.#fb.array<ITimetableEditFormTrip>([]),
    });

    get tripsForm(): FormArray<ITimetableEditFormTrip> {
        return this.form.get('trips') as FormArray<ITimetableEditFormTrip>;
    }

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
    readonly restoreTrips = input<ITimetableEditFormTripValue[] | null>(null);

    readonly clickSubmit = output<CreateTripDto[] | ReplaceTripDto[]>();
    readonly toggleIsSaveTripsIndividually = output<MatSlideToggleChange>();
    readonly selectedRouteIdsChange = output<FilterChipValue[]>();
    readonly selectCopySource = output<string>();
    readonly formValueChange = output<unknown[]>();
    readonly restored = output<void>();
    /** G9: 「下書き保存」明示クリック（自動保存に加えてユーザーへの確認手段） */
    readonly saveDraftClick = output<void>();

    readonly offsetMinutes = signal<number>(0);
    readonly currentTripIndex = signal<number>(0);
    /** 列車の数（FormArray の増減を signal にする。form.valueChanges で更新） */
    readonly tripCount = signal<number>(0);

    /** 600px 未満はスマホの配置（1 列車ずつ）。片方の配置だけを描く */
    readonly isCompact = toSignal(
        this.#breakpointObserver
            .observe(Breakpoints.XSmall)
            .pipe(map((state) => state.matches)),
        { initialValue: false },
    );

    readonly shownTripIndexes = computed(() => {
        const count = this.tripCount();
        if (count === 0) return [];
        if (this.isCompact()) {
            return [Math.min(this.currentTripIndex(), count - 1)];
        }
        return Array.from({ length: count }, (_, i) => i);
    });

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

    /** コピー元の絞り込みに打った文字 */
    readonly copySourceQuery = signal('');

    readonly #copySourceGroups = computed(() =>
        buildCopySourceGroups(
            this.copySourceCandidates(),
            this.tripClasses(),
            this.stations(),
        ),
    );

    /** コピー元の候補。種別ごとにまとめ、打った文字で絞り込む */
    readonly copySourceGroups = computed(() =>
        filterCopySourceGroups(
            this.#copySourceGroups(),
            this.copySourceQuery(),
        ),
    );

    readonly isVisibleToggleThatSaveTripsIndividually = computed(() => {
        const mode = this.mode();
        return mode !== ETimetableEditFormMode.UPDATE;
    });

    readonly isCopyMode = computed(
        () => this.mode() === ETimetableEditFormMode.COPY,
    );

    /**
     * G9: 初期値取り込みブロック（既存列車からコピー + 一括オフセット）の表示可否。
     * UPDATE 以外（ADD/COPY）で表示する。
     */
    readonly isInitialValueBlockVisible = computed(
        () => this.mode() !== ETimetableEditFormMode.UPDATE,
    );

    /** 保存ボタンのモード別ラベル */
    readonly submitButtonLabel = computed(() =>
        this.mode() === ETimetableEditFormMode.UPDATE ? '更新する' : '登録する',
    );

    /** G9: 路線チップ折り畳み時のヘッダー要約（全路線は「全路線」、何も選んでいなければ「選択なし」） */
    readonly routeFilterSummary = computed(() => {
        const options = this.routeOptions();
        const selected = this.selectedRouteIds();
        if (!options.length || selected.length === options.length) {
            return '全路線';
        }
        if (selected.length === 0) {
            return '選択なし';
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

        const option = this.#copySourceGroups()
            .flatMap((g) => g.options)
            .find((o) => o.tripBlockId === blockId);
        return option?.label ?? null;
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

            this.#loadDraftTrips(trips);
            this.currentTripIndex.set(0);
            this.restored.emit();
        });

        this.form.valueChanges.subscribe(() => {
            this.tripCount.set(this.tripsForm.length);
            if (!this.form.dirty) return;
            this.formValueChange.emit(this.tripsForm.getRawValue());
        });
    }

    onRouteFilterChange(values: FilterChipValue[]): void {
        this.selectedRouteIdsChange.emit(values);
    }

    /** 選んだあとは入力欄を空に戻す（選んだ列車はその下の「コピー元:」に出る） */
    readonly clearCopySourceInput = (): string => '';

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

    /** G9: 「下書き保存」。自動保存（valueChanges 購読）に加え明示トリガーを提供する。 */
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

    /**
     * 下書き（フォームの値そのもの）を戻す。API の列車の形に読み替えると
     * 停・通過や時刻の書式が崩れるので、空のフォームに駅 id で合わせて流し込む。
     */
    #loadDraftTrips(trips: ITimetableEditFormTripValue[]): void {
        this.#clearTripsForm();

        for (const trip of trips) {
            const tripForm = this.#generateTripFormGroup();
            tripForm.patchValue({
                ...trip,
                times: this.stations().map(
                    (station) =>
                        trip.times?.find(
                            (time) => time.stationId === station.stationId,
                        ) ?? {},
                ),
            });
            this.tripsForm.push(tripForm);
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
                        ? dayjs(time.departureTime, 'HH:mm:ss').format('HH:mm')
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

    #add(trip?: TripDetailsDto): void {
        this.tripsForm.push(this.#generateTripFormGroup(trip));
    }

    #remove(index: number): void {
        this.tripsForm.removeAt(index);

        if (this.currentTripIndex() >= this.tripsForm.controls.length) {
            this.currentTripIndex.set(
                Math.max(0, this.tripsForm.controls.length - 1),
            );
        }
    }

    #clearTripsForm(): void {
        this.tripsForm.clear();
    }

    #formInitialize(): void {
        this.#clearTripsForm();

        // ADD/COPY/UPDATE いずれも、プリフィル対象 trips（COPY のコピー元、
        // UPDATE の編集対象、ADD で「既存列車からコピー」を選んだ場合の
        // コピー元）があれば読み込み、無ければ空の 1 件で初期化する。
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
        // スマホは 1 列車ずつなので、足した列車へ移る
        this.currentTripIndex.set(this.tripsForm.controls.length - 1);
    }

    onClickRemove(index: number): void {
        this.#remove(index);
    }

    onClickClear(): void {
        this.#formInitialize();
    }

    onClickSubmit(): void {
        const dto = this.tripsForm.value.map((trip) => {
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
