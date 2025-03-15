import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    computed,
    inject,
    input,
    output,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import {
    FormArray,
    FormBuilder,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import {
    MatSlideToggleChange,
    MatSlideToggleModule,
} from '@angular/material/slide-toggle';
import { RxState } from '@rx-angular/state';
import { plainToClass } from 'class-transformer';
import dayjs from 'dayjs';
import { combineLatest, Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { classTransformerOptions } from 'src/app/core/configs/class-transformer';
import { PipesModule } from 'src/app/core/pipes/pipes.module';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { ServiceDetailsDto } from 'src/app/libs/service/usecase/dtos/service-details.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';
import { tripDirectionLabel } from 'src/app/libs/trip/special/constants/trip.constant';
import { ETripDirection } from 'src/app/libs/trip/special/enums/trip.enum';
import { CreateTripDto } from 'src/app/libs/trip/usecase/dtos/create-trip.dto';
import { ReplaceTripDto } from 'src/app/libs/trip/usecase/dtos/replace-trip.dto';
import { TimeDetailsDto } from 'src/app/libs/trip/usecase/dtos/time-details.dto';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';
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
import { TimetableEditFormValidator } from '../../validators/timetable-edit-form.validator';

@Component({
    selector: 'app-timetable-edit-form-p',
    templateUrl: './timetable-edit-form-p.component.html',
    styleUrls: ['./timetable-edit-form-p.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatCheckboxModule,
        MatRadioModule,
        MatButtonModule,
        MatSlideToggleModule,
        MatIconModule,
        PipesModule,
    ],
    providers: [RxState]
})
export class TimetableEditFormPComponent {
    readonly #cd = inject(ChangeDetectorRef);
    readonly #fb = inject(FormBuilder);
    readonly #state = inject<RxState<{}>>(RxState);

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

    readonly onClickedAdd$ = new Subject<void>();
    readonly onClickedRemove$ = new Subject<number>();
    readonly onClickedClear$ = new Subject<void>();
    readonly onClickedSubmit$ = new Subject<void>();

    readonly serviceId = input.required<ServiceDetailsDto['serviceId']>();
    readonly calendarId = input.required<CalendarDetailsDto['calendarId']>();
    readonly calendar = input.required<CalendarDetailsDto>();
    readonly mode = input.required<ETimetableEditFormMode>();
    readonly tripDirection = input.required<ETripDirection>();
    readonly stations = input.required<StationDetailsDto[]>();
    readonly operations = input.required<OperationDetailsDto[]>();
    readonly tripClasses = input.required<TripClassDetailsDto[]>();
    readonly trips = input.required<TripDetailsDto[]>();
    readonly lastSubmittedAt = input.required<number>();

    readonly clickSubmit = output<CreateTripDto[] | ReplaceTripDto[]>();
    readonly toggleIsSaveTripsIndividually = output<MatSlideToggleChange>();

    readonly isHolidayCalendar = computed(() => {
        const calendar = this.calendar();
        return calendar.sunday || calendar.saturday;
    });

    readonly isVisibleToggleThatSaveTripsIndividually = computed(() => {
        const mode = this.mode();
        return mode !== ETimetableEditFormMode.UPDATE;
    });

    constructor() {
        this.#state.hold(
            combineLatest([
                toObservable(this.serviceId),
                toObservable(this.calendarId),
                toObservable(this.mode),
                toObservable(this.tripDirection),
                toObservable(this.stations),
                toObservable(this.trips),
            ]),
            () => {
                this.#formInitialize();
            },
        );

        this.#state.hold(toObservable(this.lastSubmittedAt), () => {
            if (this.mode() !== ETimetableEditFormMode.UPDATE) {
                this.#formInitialize();
            }
        });

        this.#state.hold(this.onClickedAdd$.asObservable(), () => {
            this.#onReceiveClickAdd();
        });

        this.#state.hold(this.onClickedRemove$.asObservable(), (index) => {
            this.#onReceiveClickRemove(index);
        });

        this.#state.hold(this.onClickedClear$.asObservable(), () => {
            this.#onReceiveClickClear();
        });

        this.#state.hold(this.onClickedSubmit$.asObservable(), () => {
            this.#onReceiveClickSubmit();
        });
    }

    #generateTripFormGroup(trip?: TripDetailsDto): ITimetableEditFormTrip {
        if (trip) {
            return this.#fb.group({
                tripId: [trip.tripId],
                serviceId: [this.serviceId(), [Validators.required]],
                tripNumber: [
                    trip.tripNumber,
                    [
                        /* Validators.required */
                    ],
                ],
                tripClassId: [trip.tripClassId, [Validators.required]],
                tripName: [''],
                tripDirection: [this.tripDirection(), [Validators.required]],
                tripBlockId: [trip.tripBlockId],
                depotIn: [trip.depotIn],
                depotOut: [trip.depotOut],
                calendarId: [this.calendarId(), [Validators.required]],
                extraCalendarId: [null],
                times: this.#fb.array(
                    this.stations().map((station) =>
                        this.#generateTripTimeFormGroup(
                            station,
                            trip.times.find(
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
                    trip.tripOperationLists.length
                        ? trip.tripOperationLists[0].operationId
                        : '',
                ],
            });
        }

        return this.#fb.group({
            tripId: [null],
            serviceId: [this.serviceId(), [Validators.required]],
            tripNumber: [
                '',
                [
                    /* Validators.required */
                ],
            ],
            tripClassId: ['', [Validators.required]],
            tripName: [''],
            tripDirection: [this.tripDirection(), [Validators.required]],
            tripBlockId: [null],
            depotIn: [false],
            depotOut: [false],
            calendarId: [this.calendarId(), [Validators.required]],
            extraCalendarId: [null],
            times: this.#fb.array(
                this.stations().map((station) =>
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
                // stopSequence: [null],
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
            // stopSequence: [null],
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

            this.#state.hold(
                form
                    .get('stopType')
                    .valueChanges.pipe(
                        takeUntil(
                            this.#unsubscriber$
                                .asObservable()
                                .pipe(
                                    filter(
                                        (index) => index === unsubscribeIndex,
                                    ),
                                ),
                        ),
                    ),
                (stopType) => {
                    changeDisabledState(stopType, form);
                },
            );
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
    }

    #formInitialize(): void {
        const tripsForm = this.form.get(
            'trips',
        ) as FormArray<ITimetableEditFormTrip>;

        for (let index = 0; index < tripsForm.controls.length; index++) {
            this.#unsubscriber$.next(index);
        }

        tripsForm.clear();

        switch (this.mode()) {
            case ETimetableEditFormMode.ADD:
                this.#add();
                break;
            case ETimetableEditFormMode.COPY:
            case ETimetableEditFormMode.UPDATE:
                for (const trip of this.trips()) {
                    this.#add(trip);
                }
                break;
        }

        this.#cd.markForCheck();
    }

    #onReceiveClickAdd(): void {
        this.#add();
    }

    #onReceiveClickRemove(index: number): void {
        this.#remove(index);
    }

    #onReceiveClickClear(): void {
        this.#formInitialize();
    }

    #onReceiveClickSubmit(): void {
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
