import { Injectable } from '@angular/core';
import { guid, Query, Store } from '@datorama/akita';
import dayjs, { Dayjs } from 'dayjs';
import { map } from 'rxjs/operators';
import { OperationSightingTimeCrossSectionDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-time-cross-section.dto';
import { OperationCurrentPositionDto } from 'src/app/libs/operation/usecase/dtos/operation-current-position.dto';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';
import { OperationRealTimeUtil } from '../utils/operation-real-time.util';

type OperationRealTimeState = {
    operationSightingTimeCrossSections: OperationSightingTimeCrossSectionDto[];
    formationSightingTimeCrossSections: OperationSightingTimeCrossSectionDto[];
    currentPositions: OperationCurrentPositionDto[];
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
                operationSightingTimeCrossSections: [],
                formationSightingTimeCrossSections: [],
                currentPositions: [],
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

    updateCurrentPositions(positions: OperationCurrentPositionDto[]): void {
        this.update({
            currentPositions: [
                ...this.getValue().currentPositions.filter(
                    (prev) =>
                        !positions
                            .map((next) => next.operation.operationId)
                            .includes(prev.operation.operationId)
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

    setIsVisibleCurrentPosition(bool: boolean): void {
        this.update({
            isVisibleCurrentPosition: bool,
        });
    }
}

@Injectable()
export class OperationRealTimeStateQuery extends Query<OperationRealTimeState> {
    operationSightingTimeCrossSections$ = this.select(
        'operationSightingTimeCrossSections'
    );
    formationSightingTimeCrossSections$ = this.select(
        'formationSightingTimeCrossSections'
    );
    currentPositions$ = this.select('currentPositions');
    currentPositionsThatShouldUpdate$ = this.select('currentPositions').pipe(
        map((currentPositions) =>
            OperationRealTimeUtil.filterOperationCurrentPositionsThatShouldUpdate(
                currentPositions
            )
        )
    );
    tripClasses$ = this.select('tripClasses');
    finalUpdateTime$ = this.select('finalUpdateTime');
    isEnableAutoReload$ = this.select('isEnableAutoReload');
    isVisibleCurrentPosition$ = this.select('isVisibleCurrentPosition');

    get currentPositions(): OperationCurrentPositionDto[] {
        return this.getValue().currentPositions;
    }

    get currentPositionsThatShouldUpdate(): OperationCurrentPositionDto[] {
        return OperationRealTimeUtil.filterOperationCurrentPositionsThatShouldUpdate(
            this.getValue().currentPositions
        );
    }

    get isEnableAutoReload(): boolean {
        return this.getValue().isEnableAutoReload;
    }

    constructor(protected store: OperationRealTimeStateStore) {
        super(store);
    }
}
