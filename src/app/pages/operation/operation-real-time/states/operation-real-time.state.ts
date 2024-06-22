import { Injectable } from '@angular/core';
import { guid, Query, Store } from '@datorama/akita';
import dayjs, { Dayjs } from 'dayjs';
import { FormationDetailsDto } from 'src/app/libs/formation/usecase/dtos/formation-details.dto';
import { OperationSightingTimeCrossSectionDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-time-cross-section.dto';
import { OperationCurrentPositionDto } from 'src/app/libs/operation/usecase/dtos/operation-current-position.dto';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';

type OperationRealTimeState = {
    operations: OperationDetailsDto[];
    formations: FormationDetailsDto[];
    operationSightingTimeCrossSections: OperationSightingTimeCrossSectionDto[];
    formationSightingTimeCrossSections: OperationSightingTimeCrossSectionDto[];
    currentPositions: OperationCurrentPositionDto[];
    stations: StationDetailsDto[];
    tripClasses: TripClassDetailsDto[];
    finalUpdateTime: Dayjs;
    isEnableAutoReload: boolean;
    isVisibleCurrentPosition: boolean;
};

@Injectable()
export class OperationRealTimeStateStore extends Store<OperationRealTimeState> {
    constructor() {
        super(
            {
                operations: [],
                formations: [],
                operationSightingTimeCrossSections: [],
                formationSightingTimeCrossSections: [],
                currentPositions: [],
                stations: [],
                tripClasses: [],
                finalUpdateTime: dayjs(),
                isEnableAutoReload: true,
                isVisibleCurrentPosition: true,
            },
            {
                name: `OperationRealTime-${guid()}`,
            }
        );
    }

    setOperations(operations: OperationDetailsDto[]): void {
        this.update({
            operations,
        });
    }

    setFormations(formations: FormationDetailsDto[]): void {
        this.update({
            formations,
        });
    }

    setOperationSightingTimeCrossSections(
        timeCrossSections: OperationSightingTimeCrossSectionDto[]
    ): void {
        this.update({
            operationSightingTimeCrossSections: timeCrossSections,
        });
    }

    setFormationSightingTimeCrossSections(
        timeCrossSections: OperationSightingTimeCrossSectionDto[]
    ): void {
        this.update({
            formationSightingTimeCrossSections: timeCrossSections,
        });
    }

    setCurrentPositions(positions: OperationCurrentPositionDto[]): void {
        this.update({
            currentPositions: positions,
        });
    }

    setStations(stations: StationDetailsDto[]): void {
        this.update({
            stations,
        });
    }

    setTripClasses(classes: TripClassDetailsDto[]): void {
        this.update({
            tripClasses: classes,
        });
    }

    updateFinalUpdateTime(): void {
        this.update({
            finalUpdateTime: dayjs(),
        });
    }

    setIsEnableAutoReload(bool: boolean): void {
        this.update({
            isEnableAutoReload: bool,
        });
    }

    setIsVisibleCurrentPosition(bool: boolean): void {
        this.update({
            isVisibleCurrentPosition: bool,
        });
    }
}

@Injectable()
export class OperationRealTimeStateQuery extends Query<OperationRealTimeState> {
    operations$ = this.select('operations');
    formations$ = this.select('formations');
    operationSightingTimeCrossSections$ = this.select(
        'operationSightingTimeCrossSections'
    );
    formationSightingTimeCrossSections$ = this.select(
        'formationSightingTimeCrossSections'
    );
    currentPositions$ = this.select('currentPositions');
    stations$ = this.select('stations');
    tripClasses$ = this.select('tripClasses');
    finalUpdateTime$ = this.select('finalUpdateTime');
    isEnableAutoReload$ = this.select('isEnableAutoReload');
    isVisibleCurrentPosition$ = this.select('isVisibleCurrentPosition');

    get isEnableAutoReload(): boolean {
        return this.getValue().isEnableAutoReload;
    }

    constructor(protected store: OperationRealTimeStateStore) {
        super(store);
    }
}
