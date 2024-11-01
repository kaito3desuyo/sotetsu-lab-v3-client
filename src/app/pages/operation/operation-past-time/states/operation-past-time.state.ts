import { inject, Injectable } from '@angular/core';
import { select, setProps } from '@ngneat/elf';
import dayjs from 'dayjs';
import { groupBy, isString } from 'es-toolkit';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { createElfStore } from 'src/app/core/utils/elf-store';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { FormationDetailsDto } from 'src/app/libs/formation/usecase/dtos/formation-details.dto';
import { OperationSightingDetailsDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-details.dto';

type State = {
    referenceDate: string;
    days: number;
    calendars: { date: string; calendar: CalendarDetailsDto }[];
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
            calendars: [],
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
    readonly calendars$ = this.#store.state.pipe(
        select((state) => state.calendars),
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

    selectDates(): Observable<string[]> {
        return this.#store.state.pipe(
            select((state) => ({
                referenceDate: state.referenceDate,
                days: state.days,
            })),
            map(({ referenceDate, days }) => {
                if (!referenceDate || !days) return [];
                const dates: string[] = [];
                const base = dayjs(referenceDate, 'YYYY-MM-DD');
                for (let i = 0; i < days; i++) {
                    const date = base.add(i, 'days');
                    dates.push(date.format('YYYY-MM-DD'));
                }
                return dates;
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
            map((sightings) => {
                const groupedByFormationId: [
                    string,
                    OperationSightingDetailsDto[],
                ][] = Object.entries(groupBy(sightings, (o) => o.formationId));

                const groupedByDate: {
                    [formationId: string]: {
                        [date: string]: OperationSightingDetailsDto[];
                    };
                } = groupedByFormationId
                    .map(([formationId, sightings]) => {
                        return [
                            formationId,
                            groupBy(sightings, (o) =>
                                dayjs(o.sightingTime)
                                    .subtract(
                                        dayjs(o.sightingTime).hour() < 4
                                            ? 1
                                            : 0,
                                        'days',
                                    )
                                    .format('YYYY-MM-DD'),
                            ),
                        ];
                    })
                    .reduce((base, [formationId, sighting]) => {
                        if (!isString(formationId)) {
                            return { ...base };
                        }
                        return { ...base, [formationId]: sighting };
                    }, {});

                return groupedByDate;
            }),
        );
    }
}
