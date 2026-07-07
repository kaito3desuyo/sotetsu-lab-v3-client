import { createStore, select, setProp, withProps } from '@ngneat/elf';
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
import { toZonedTime } from 'date-fns-tz';
import { flow, groupBy, isString } from 'es-toolkit';
import { map } from 'rxjs/operators';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { FormationDetailsDto } from 'src/app/libs/formation/usecase/dtos/formation-details.dto';
import { OperationSightingDetailsDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-details.dto';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';

type OperationSightingsGroupedByDate = {
    [formationId: string]: {
        [date: string]: OperationSightingDetailsDto[];
    };
};

type StoreProps = {
    referenceDate: string;
    days: number;
    includeInvalidated: boolean;
    calendars: { date: string; calendar: CalendarDetailsDto }[];
    operations: OperationDetailsDto[];
    formations: FormationDetailsDto[];
    operationSightings: OperationSightingDetailsDto[];
    selectedAgencyIds: string[];
    loadingQueue: boolean[];
};

const store = createStore(
    { name: 'OperationPastTimeStore' },
    withProps<StoreProps>({
        referenceDate: null,
        days: null,
        includeInvalidated: false,
        calendars: [],
        operations: [],
        formations: [],
        operationSightings: [],
        selectedAgencyIds: [],
        loadingQueue: [],
    }),
);

function generateDates(referenceDate: string, days: number): string[] {
    if (!referenceDate || !days) return [];

    const initializeTime = flow(
        (date: Date) => setHours(date, 4),
        (date: Date) => setMinutes(date, 0),
        (date: Date) => setSeconds(date, 0),
        (date: Date) => setMilliseconds(date, 0),
    );

    const dates: string[] = [];
    const base = initializeTime(
        parse(referenceDate, 'yyyy-MM-dd', new Date()),
    );

    for (let i = 0; i < days; i++) {
        dates.push(format(addDays(base, i), 'yyyy-MM-dd'));
    }

    return dates;
}

function groupSightingsByFormationAndDate(
    sightings: OperationSightingDetailsDto[],
): OperationSightingsGroupedByDate {
    return flow(
        (list: OperationSightingDetailsDto[]) =>
            groupBy(list, (o) => o.formationId),
        (grouped) => Object.entries(grouped),
        (entries) =>
            entries.map(([formationId, sightingsOfFormation]) => [
                formationId,
                groupBy(sightingsOfFormation, (o) => {
                    const date = toZonedTime(
                        parseISO(o.sightingTime),
                        'Asia/Tokyo',
                    );
                    const adjustedDate =
                        getHours(date) < 4 ? subDays(date, 1) : date;
                    return format(adjustedDate, 'yyyy-MM-dd');
                }),
            ]),
        (arr): OperationSightingsGroupedByDate =>
            arr.reduce((base, [formationId, sightingsOfDate]) => {
                if (!isString(formationId)) {
                    return { ...base };
                }
                return { ...base, [formationId]: sightingsOfDate };
            }, {}),
    )(sightings);
}

export const OperationPastTimeStore = {
    setReferenceDate(referenceDate: string): void {
        store.update(setProp('referenceDate', () => referenceDate));
    },
    setDays(days: number): void {
        store.update(setProp('days', () => days));
    },
    setIncludeInvalidated(includeInvalidated: boolean): void {
        store.update(setProp('includeInvalidated', () => includeInvalidated));
    },
    setCalendars(
        calendars: { date: string; calendar: CalendarDetailsDto }[],
    ): void {
        store.update(setProp('calendars', () => calendars));
    },
    setOperations(operations: OperationDetailsDto[]): void {
        store.update(setProp('operations', () => operations));
    },
    setFormations(formations: FormationDetailsDto[]): void {
        store.update(setProp('formations', () => formations));
    },
    setOperationSightings(
        operationSightings: OperationSightingDetailsDto[],
    ): void {
        store.update(setProp('operationSightings', () => operationSightings));
    },
    setSelectedAgencyIds(agencyIds: string[]): void {
        store.update(setProp('selectedAgencyIds', () => agencyIds));
    },
    enableLoading(): void {
        store.update(setProp('loadingQueue', (state) => state.concat(true)));
    },
    disableLoading(): void {
        store.update(setProp('loadingQueue', (state) => state.slice(1)));
    },
    resetLoading(): void {
        store.update(setProp('loadingQueue', () => []));
    },

    referenceDate$: store.pipe(select((state) => state.referenceDate)),
    days$: store.pipe(select((state) => state.days)),
    includeInvalidated$: store.pipe(
        select((state) => state.includeInvalidated),
    ),
    calendars$: store.pipe(select((state) => state.calendars)),
    operations$: store.pipe(select((state) => state.operations)),
    formations$: store.pipe(select((state) => state.formations)),
    operationSightings$: store.pipe(select((state) => state.operationSightings)),
    selectedAgencyIds$: store.pipe(select((state) => state.selectedAgencyIds)),
    isLoading$: store.pipe(select((state) => state.loadingQueue.length > 0)),
    operationSightingsGroupedByDate$: store.pipe(
        select((state) => state.operationSightings),
        map(groupSightingsByFormationAndDate),
    ),

    get referenceDate(): string {
        return store.getValue().referenceDate;
    },
    get days(): number {
        return store.getValue().days;
    },
    get includeInvalidated(): boolean {
        return store.getValue().includeInvalidated;
    },
    get dates(): string[] {
        const { referenceDate, days } = store.getValue();
        return generateDates(referenceDate, days);
    },
} as const;
