import { inject, Injectable } from '@angular/core';
import { select, setProps } from '@ngneat/elf';
import {
    addDays,
    format,
    getHours,
    parse,
    parseISO,
    setHours,
    setMilliseconds,
    setMinutes,
    setSeconds,
    subDays,
} from 'date-fns';
import { flow, groupBy, isString } from 'es-toolkit';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { createElfStore } from 'src/app/core/utils/elf-store';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { FormationDetailsDto } from 'src/app/libs/formation/usecase/dtos/formation-details.dto';
import { OperationSightingDetailsDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-details.dto';
import { toZonedTime } from 'date-fns-tz';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';

type State = {
    referenceDate: string;
    days: number;
    includeInvalidated: boolean;
    calendars: { date: string; calendar: CalendarDetailsDto }[];
    operations: OperationDetailsDto[];
    formations: FormationDetailsDto[];
    operationSightings: OperationSightingDetailsDto[];
};

@Injectable()
export class OperationPastTimeStateStore {
    readonly state = createElfStore<State>({
        name: 'OperationPastTime',
        initialValue: {
            referenceDate: null,
            days: null,
            includeInvalidated: false,
            calendars: [],
            operations: [],
            formations: [],
            operationSightings: [],
        },
    });

    setReferenceDate(date: string): void {
        this.state.update(
            setProps({
                referenceDate: date,
            }),
        );
    }

    setDays(days: number): void {
        this.state.update(
            setProps({
                days,
            }),
        );
    }

    setIncludeInvalidated(includeInvalidated: boolean): void {
        this.state.update(
            setProps({
                includeInvalidated,
            }),
        );
    }

    setCalendars(
        calendars: {
            date: string;
            calendar: CalendarDetailsDto;
        }[],
    ): void {
        this.state.update(
            setProps({
                calendars,
            }),
        );
    }

    setOperations(operations: OperationDetailsDto[]): void {
        this.state.update(
            setProps({
                operations,
            }),
        );
    }

    setFormations(formations: FormationDetailsDto[]): void {
        this.state.update(
            setProps({
                formations,
            }),
        );
    }

    setOperationSightings(sightings: OperationSightingDetailsDto[]): void {
        this.state.update(
            setProps({
                operationSightings: sightings,
            }),
        );
    }
}

@Injectable()
export class OperationPastTimeStateQuery {
    readonly #store = inject(OperationPastTimeStateStore);

    readonly referenceDate$ = this.#store.state.pipe(
        select((state) => state.referenceDate),
    );
    readonly days$ = this.#store.state.pipe(select((state) => state.days));
    readonly includeInvalidated$ = this.#store.state.pipe(
        select((state) => state.includeInvalidated),
    );
    readonly calendars$ = this.#store.state.pipe(
        select((state) => state.calendars),
    );
    readonly operations$ = this.#store.state.pipe(
        select((state) => state.operations),
    );
    readonly formations$ = this.#store.state.pipe(
        select((state) => state.formations),
    );

    get referenceDate(): string {
        const { referenceDate } = this.#store.state.getValue();
        return referenceDate;
    }

    get days(): number {
        const { days } = this.#store.state.getValue();
        return days;
    }

    get includeInvalidated(): boolean {
        const { includeInvalidated } = this.#store.state.getValue();
        return includeInvalidated;
    }

    get dates(): string[] {
        return this.#generateDates(this.referenceDate, this.days);
    }

    selectDates(): Observable<string[]> {
        return this.#store.state.pipe(
            select((state) => ({
                referenceDate: state.referenceDate,
                days: state.days,
            })),
            map(({ referenceDate, days }) => {
                return this.#generateDates(referenceDate, days);
            }),
        );
    }

    selectOperationSightingsGroupedByDate(): Observable<{
        [formationId: string]: {
            [date: string]: OperationSightingDetailsDto[];
        };
    }> {
        return this.#store.state.pipe(
            select((state) => state.operationSightings),
            map(
                flow(
                    (sightings: OperationSightingDetailsDto[]) =>
                        groupBy(sightings, (o) => o.formationId),
                    (grouped) => Object.entries(grouped),
                    (entries) =>
                        entries.map(([formationId, sightings]) => {
                            return [
                                formationId,
                                groupBy(sightings, (o) => {
                                    const date = toZonedTime(
                                        parseISO(o.sightingTime),
                                        'Asia/Tokyo',
                                    );
                                    const adjustedDate =
                                        getHours(date) < 4
                                            ? subDays(date, 1)
                                            : date;
                                    return format(adjustedDate, 'yyyy-MM-dd');
                                }),
                            ];
                        }),
                    (
                        arr,
                    ): {
                        [formationId: string]: {
                            [date: string]: OperationSightingDetailsDto[];
                        };
                    } =>
                        arr.reduce((base, [formationId, sighting]) => {
                            if (!isString(formationId)) {
                                return { ...base };
                            }
                            return { ...base, [formationId]: sighting };
                        }, {}),
                ),
            ),
        );
    }

    #generateDates(referenceDate: string, days: number): string[] {
        if (!referenceDate || !days) return [];

        const initializeTime = flow(
            (date) => setHours(date, 4),
            (date) => setMinutes(date, 0),
            (date) => setSeconds(date, 0),
            (date) => setMilliseconds(date, 0),
        );

        const dates: string[] = [];
        const base = initializeTime(
            parse(referenceDate, 'yyyy-MM-dd', new Date()),
        );

        for (let i = 0; i < days; i++) {
            const date = addDays(base, i);
            dates.push(format(date, 'yyyy-MM-dd'));
        }

        return dates;
    }
}
