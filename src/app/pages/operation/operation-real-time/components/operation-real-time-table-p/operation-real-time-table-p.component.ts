import {
    ChangeDetectionStrategy,
    Component,
    Input,
    ViewChild,
} from '@angular/core';
import { MatSort, Sort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { RxState } from '@rx-angular/state';
import { combineLatest, Subject } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { FormationDetailsDto } from 'src/app/libs/formation/usecase/dtos/formation-details.dto';
import { OperationSightingWithCirculatedDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-with-circulated.dto';
import { OperationCurrentPositionDto } from 'src/app/libs/operation/usecase/dtos/operation-current-position.dto';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';
import { IOperationRealTimeTableData } from '../../interfaces/operation-real-time-table-data.interface';

type State = {
    mode: 'operation' | 'formation';
    todaysCalendarId: string;
    stations: StationDetailsDto[];
    tripClasses: TripClassDetailsDto[];
    displayedColumns: string[];
    sort: Sort;
};

@Component({
    selector: 'app-operation-real-time-table-p',
    templateUrl: './operation-real-time-table-p.component.html',
    styleUrls: ['./operation-real-time-table-p.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [RxState],
})
export class OperationRealTimeTablePComponent {
    readonly dataSource = new MatTableDataSource<IOperationRealTimeTableData>(
        []
    );

    readonly mode$ = this.state.select('mode');
    readonly todaysCalendarId$ = this.state.select('todaysCalendarId');
    readonly stations$ = this.state.select('stations');
    readonly tripClasses$ = this.state.select('tripClasses');
    readonly displayedColumns$ = this.state.select('displayedColumns');
    private readonly _sort$ = this.state.select('sort');

    readonly onChangedInputMode$ = new Subject<'operation' | 'formation'>();
    readonly onChangedInputTodaysCalendarId$ = new Subject<string>();
    readonly onChangedInputOperations$ = new Subject<OperationDetailsDto[]>();
    readonly onChangedInputFormations$ = new Subject<FormationDetailsDto[]>();
    readonly onChangedInputLatestSightings$ = new Subject<
        OperationSightingWithCirculatedDto[]
    >();
    readonly onChangedInputCurrentPositions$ = new Subject<
        OperationCurrentPositionDto[]
    >();
    readonly onChangedInputStations$ = new Subject<StationDetailsDto[]>();
    readonly onChangedInputTripClasses$ = new Subject<TripClassDetailsDto[]>();
    readonly onChangedMatSort$ = new Subject<Sort>();

    @Input() set mode(mode: 'operation' | 'formation') {
        this.onChangedInputMode$.next(mode);
    }

    @Input() set todaysCalendarId(id: string) {
        this.onChangedInputTodaysCalendarId$.next(id);
    }

    @Input() set operations(operations: OperationDetailsDto[]) {
        this.onChangedInputOperations$.next(operations);
    }

    @Input() set formations(formations: FormationDetailsDto[]) {
        this.onChangedInputFormations$.next(formations);
    }

    @Input() set latestSightings(
        sightings: OperationSightingWithCirculatedDto[]
    ) {
        this.onChangedInputLatestSightings$.next(sightings);
    }

    @Input() set currentPositions(positions: OperationCurrentPositionDto[]) {
        this.onChangedInputCurrentPositions$.next(positions);
    }

    @Input() set stations(stations: StationDetailsDto[]) {
        this.onChangedInputStations$.next(stations);
    }

    @Input() set tripClasses(classes: TripClassDetailsDto[]) {
        this.onChangedInputTripClasses$.next(classes);
    }

    @ViewChild(MatSort, { static: true }) sort: MatSort;

    constructor(private readonly state: RxState<State>) {
        this.state.set({
            sort: {
                active: '',
                direction: '',
            },
        });

        this.state.connect('mode', this.onChangedInputMode$);
        this.state.connect(
            'todaysCalendarId',
            this.onChangedInputTodaysCalendarId$
        );
        this.state.connect('stations', this.onChangedInputStations$);
        this.state.connect('tripClasses', this.onChangedInputTripClasses$);
        this.state.connect(
            'displayedColumns',
            this.onChangedInputMode$.pipe(
                map((mode) => {
                    if (mode === 'operation') {
                        return [
                            'operationNumber',
                            'formationNumber',
                            'currentPosition',
                            'sightingTime',
                            'updatedAt',
                        ];
                    }

                    if (mode === 'formation') {
                        return [
                            'formationNumber',
                            'operationNumber',
                            'currentPosition',
                            'sightingTime',
                            'updatedAt',
                        ];
                    }

                    return [];
                })
            )
        );
        this.state.connect('sort', this.onChangedMatSort$);

        this.state.hold(
            combineLatest([
                this.onChangedInputMode$,
                this.onChangedInputOperations$,
                this.onChangedInputFormations$,
                this.onChangedInputLatestSightings$,
                this.onChangedInputCurrentPositions$,
                this._sort$,
            ]).pipe(
                map(
                    ([
                        mode,
                        operations,
                        formations,
                        sightings,
                        positions,
                        sort,
                    ]) => {
                        if (mode === 'operation') {
                            return this._generateOperationTableData(
                                operations,
                                sightings,
                                positions,
                                sort
                            );
                        }

                        if (mode === 'formation') {
                            return this._generateFormationTableData(
                                formations,
                                sightings,
                                positions,
                                sort
                            );
                        }

                        return [];
                    }
                ),
                tap((data) => {
                    this.dataSource.data = data;
                })
            )
        );
    }

    private _generateOperationTableData(
        operations: OperationDetailsDto[],
        sightings: OperationSightingWithCirculatedDto[],
        positions: OperationCurrentPositionDto[],
        sort: Sort
    ): IOperationRealTimeTableData[] {
        const data = operations
            .filter((o) => o.operationNumber !== '100')
            .map((o) => {
                const sighting = sightings.find(
                    (so) => so.circulatedOperationId === o.operationId
                );
                const position = positions.find(
                    (so) => so.operation.operationId === o.operationId
                );

                return {
                    operation: o,
                    operationSighting: sighting ?? null,
                    currentPosition: position ?? null,
                };
            });

        if (sort.active === 'operationNumber') {
            return data.sort((a, b) => {
                if (sort.direction === 'asc') {
                    return (
                        Number(a.operation.operationNumber) -
                        Number(b.operation.operationNumber)
                    );
                }
                if (sort.direction === 'desc') {
                    return (
                        Number(b.operation.operationNumber) -
                        Number(a.operation.operationNumber)
                    );
                }
            });
        } else if (sort.active === 'formationNumber') {
            return data.sort((a, b) => {
                if (sort.direction === 'asc') {
                    return (
                        Number(
                            a.operationSighting?.formation.formationNumber ?? 0
                        ) -
                        Number(
                            b.operationSighting?.formation.formationNumber ?? 0
                        )
                    );
                }
                if (sort.direction === 'desc') {
                    return (
                        Number(
                            b.operationSighting?.formation.formationNumber ?? 0
                        ) -
                        Number(
                            a.operationSighting?.formation.formationNumber ?? 0
                        )
                    );
                }
            });
        } else {
            return data;
        }
    }

    private _generateFormationTableData(
        formations: FormationDetailsDto[],
        sightings: OperationSightingWithCirculatedDto[],
        positions: OperationCurrentPositionDto[],
        sort: Sort
    ): IOperationRealTimeTableData[] {
        const data = formations.map((o) => {
            const sighting = sightings.find(
                (so) => so.formationId === o.formationId
            );
            const position = positions.find(
                (so) =>
                    so.operation.operationId === sighting?.circulatedOperationId
            );

            return {
                formation: o,
                operationSighting: sighting ?? null,
                currentPosition: position ?? null,
            };
        });

        if (sort.active === 'operationNumber') {
            return data.sort((a, b) => {
                if (sort.direction === 'asc') {
                    return (
                        Number(
                            a.operationSighting?.circulatedOperation
                                ?.operationNumber ?? 0
                        ) -
                        Number(
                            b.operationSighting?.circulatedOperation
                                ?.operationNumber ?? 0
                        )
                    );
                }
                if (sort.direction === 'desc') {
                    return (
                        Number(
                            b.operationSighting?.circulatedOperation
                                ?.operationNumber ?? 0
                        ) -
                        Number(
                            a.operationSighting?.circulatedOperation
                                ?.operationNumber ?? 0
                        )
                    );
                }
            });
        } else if (sort.active === 'formationNumber') {
            return data.sort((a, b) => {
                if (sort.direction === 'asc') {
                    return (
                        Number(a.formation.formationNumber) -
                        Number(b.formation.formationNumber)
                    );
                }
                if (sort.direction === 'desc') {
                    return (
                        Number(b.formation.formationNumber) -
                        Number(a.formation.formationNumber)
                    );
                }
            });
        } else {
            return data;
        }
    }
}
