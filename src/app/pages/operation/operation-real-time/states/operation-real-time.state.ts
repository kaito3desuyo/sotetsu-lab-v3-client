import { Injectable } from '@angular/core';
import { guid, Query, Store } from '@datorama/akita';
import dayjs, { Dayjs } from 'dayjs';
import { map } from 'rxjs/operators';
import { OperationSightingDetailsDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-details.dto';
import { OperationSightingTimeCrossSectionDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-time-cross-section.dto';
import { OperationCurrentPositionDto } from 'src/app/libs/operation/usecase/dtos/operation-current-position.dto';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';
import { OperationRealTimeUtil } from '../utils/operation-real-time.util';

type OperationRealTimeState = {
    operationSightingTimeCrossSections: OperationSightingTimeCrossSectionDto[];
    formationSightingTimeCrossSections: OperationSightingTimeCrossSectionDto[];
    operationSightingHistories: OperationSightingDetailsDto[];
    formationSightingHistories: OperationSightingDetailsDto[];
    currentPositions: OperationCurrentPositionDto[];
    tripClasses: TripClassDetailsDto[];
    finalUpdateTime: Dayjs;
    isEnableAutoReload: boolean;
    isVisibleSightingHistories: boolean;
    isVisibleCurrentPosition: boolean;
};

@Injectable()
export class OperationRealTimeStateStore extends Store<OperationRealTimeState> {
    constructor() {
        super(
            {
                operationSightingTimeCrossSections: [],
                formationSightingTimeCrossSections: [],
                operationSightingHistories: [],
                formationSightingHistories: [],
                currentPositions: [],
                tripClasses: [],
                finalUpdateTime: dayjs(),
                isEnableAutoReload: true,
                isVisibleSightingHistories: true,
                isVisibleCurrentPosition: true,
            },
            {
                name: `OperationRealTime-${guid()}`,
            },
        );
    }

    setOperationSightingTimeCrossSections(
        timeCrossSections: OperationSightingTimeCrossSectionDto[],
    ): void {
        this.update({
            operationSightingTimeCrossSections: timeCrossSections,
        });
    }

    setFormationSightingTimeCrossSections(
        timeCrossSections: OperationSightingTimeCrossSectionDto[],
    ): void {
        this.update({
            formationSightingTimeCrossSections: timeCrossSections,
        });
    }

    setOperationSightingHistories(
        sightings: OperationSightingDetailsDto[],
    ): void {
        this.update({
            operationSightingHistories: sightings,
        });
    }

    setFormationSightingHistories(
        sightings: OperationSightingDetailsDto[],
    ): void {
        this.update({
            formationSightingHistories: sightings,
        });
    }

    setCurrentPositions(positions: OperationCurrentPositionDto[]): void {
        this.update({
            currentPositions: positions,
        });
    }

    updateCurrentPositions(positions: OperationCurrentPositionDto[]): void {
        this.update({
            currentPositions: [
                ...this.getValue().currentPositions.filter(
                    (prev) =>
                        !positions
                            .map((next) => next.operation.operationId)
                            .includes(prev.operation.operationId),
                ),
                ...positions,
            ],
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

    setIsVisibleSightingHistories(bool: boolean): void {
        this.update({
            isVisibleSightingHistories: bool,
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
    operationSightingTimeCrossSections$ = this.select(
        'operationSightingTimeCrossSections',
    );
    formationSightingTimeCrossSections$ = this.select(
        'formationSightingTimeCrossSections',
    );
    operationSightingHistories$ = this.select('operationSightingHistories');
    formationSightingHistories$ = this.select('formationSightingHistories');
    currentPositions$ = this.select('currentPositions');
    currentPositionsThatShouldUpdate$ = this.select('currentPositions').pipe(
        map((currentPositions) =>
            OperationRealTimeUtil.filterOperationCurrentPositionsThatShouldUpdate(
                currentPositions,
            ),
        ),
    );
    tripClasses$ = this.select('tripClasses');
    finalUpdateTime$ = this.select('finalUpdateTime');
    isEnableAutoReload$ = this.select('isEnableAutoReload');
    isVisibleSightingHistories$ = this.select('isVisibleSightingHistories');
    isVisibleCurrentPosition$ = this.select('isVisibleCurrentPosition');

    get currentPositions(): OperationCurrentPositionDto[] {
        return this.getValue().currentPositions;
    }

    get currentPositionsThatShouldUpdate(): OperationCurrentPositionDto[] {
        return OperationRealTimeUtil.filterOperationCurrentPositionsThatShouldUpdate(
            this.getValue().currentPositions,
        );
    }

    get isEnableAutoReload(): boolean {
        return this.getValue().isEnableAutoReload;
    }

    constructor(protected store: OperationRealTimeStateStore) {
        super(store);
    }
}
