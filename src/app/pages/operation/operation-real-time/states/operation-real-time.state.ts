import { inject, Injectable } from '@angular/core';
import { select, setProps } from '@ngneat/elf';
import dayjs, { Dayjs } from 'dayjs';
import { map } from 'rxjs/operators';
import { createElfStore } from 'src/app/core/utils/elf-store';
import { OperationSightingDetailsDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-details.dto';
import { OperationSightingTimeCrossSectionDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-time-cross-section.dto';
import { OperationCurrentPositionDto } from 'src/app/libs/operation/usecase/dtos/operation-current-position.dto';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';
import { OperationRealTimeUtil } from '../utils/operation-real-time.util';

type State = {
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
export class OperationRealTimeStateStore {
    readonly state = createElfStore<State>({
        name: 'OperationRealTime',
        initialValue: {
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
    });

    setOperationSightingTimeCrossSections(
        timeCrossSections: OperationSightingTimeCrossSectionDto[],
    ): void {
        this.state.update(
            setProps({
                operationSightingTimeCrossSections: timeCrossSections,
            }),
        );
    }

    setFormationSightingTimeCrossSections(
        timeCrossSections: OperationSightingTimeCrossSectionDto[],
    ): void {
        this.state.update(
            setProps({
                formationSightingTimeCrossSections: timeCrossSections,
            }),
        );
    }

    setOperationSightingHistories(
        sightings: OperationSightingDetailsDto[],
    ): void {
        this.state.update(
            setProps({
                operationSightingHistories: sightings,
            }),
        );
    }

    setFormationSightingHistories(
        sightings: OperationSightingDetailsDto[],
    ): void {
        this.state.update(
            setProps({
                formationSightingHistories: sightings,
            }),
        );
    }

    setCurrentPositions(positions: OperationCurrentPositionDto[]): void {
        this.state.update(
            setProps({
                currentPositions: positions,
            }),
        );
    }

    updateCurrentPositions(positions: OperationCurrentPositionDto[]): void {
        this.state.update(
            setProps(({ currentPositions }) => ({
                currentPositions: [
                    ...currentPositions.filter(
                        (prev) =>
                            !positions
                                .map((next) => next.operation.operationId)
                                .includes(prev.operation.operationId),
                    ),
                    ...positions,
                ],
            })),
        );
    }

    setTripClasses(classes: TripClassDetailsDto[]): void {
        this.state.update(
            setProps({
                tripClasses: classes,
            }),
        );
    }

    updateFinalUpdateTime(): void {
        this.state.update(
            setProps({
                finalUpdateTime: dayjs(),
            }),
        );
    }

    setIsEnableAutoReload(bool: boolean): void {
        this.state.update(
            setProps({
                isEnableAutoReload: bool,
            }),
        );
    }

    setIsVisibleSightingHistories(bool: boolean): void {
        this.state.update(
            setProps({
                isVisibleSightingHistories: bool,
            }),
        );
    }

    setIsVisibleCurrentPosition(bool: boolean): void {
        this.state.update(
            setProps({
                isVisibleCurrentPosition: bool,
            }),
        );
    }
}

@Injectable()
export class OperationRealTimeStateQuery {
    readonly #store = inject(OperationRealTimeStateStore);

    operationSightingTimeCrossSections$ = this.#store.state.pipe(
        select((state) => state.operationSightingTimeCrossSections),
    );
    formationSightingTimeCrossSections$ = this.#store.state.pipe(
        select((state) => state.formationSightingTimeCrossSections),
    );
    operationSightingHistories$ = this.#store.state.pipe(
        select((state) => state.operationSightingHistories),
    );
    formationSightingHistories$ = this.#store.state.pipe(
        select((state) => state.formationSightingHistories),
    );
    currentPositions$ = this.#store.state.pipe(
        select((state) => state.currentPositions),
    );
    currentPositionsThatShouldUpdate$ = this.#store.state.pipe(
        select((state) => state.currentPositions),
        map((currentPositions) =>
            OperationRealTimeUtil.filterOperationCurrentPositionsThatShouldUpdate(
                currentPositions,
            ),
        ),
    );
    tripClasses$ = this.#store.state.pipe(select((state) => state.tripClasses));
    finalUpdateTime$ = this.#store.state.pipe(
        select((state) => state.finalUpdateTime),
    );
    isEnableAutoReload$ = this.#store.state.pipe(
        select((state) => state.isEnableAutoReload),
    );
    isVisibleSightingHistories$ = this.#store.state.pipe(
        select((state) => state.isVisibleSightingHistories),
    );
    isVisibleCurrentPosition$ = this.#store.state.pipe(
        select((state) => state.isVisibleCurrentPosition),
    );

    get currentPositions(): OperationCurrentPositionDto[] {
        const { currentPositions } = this.#store.state.getValue();
        return currentPositions;
    }

    get currentPositionsThatShouldUpdate(): OperationCurrentPositionDto[] {
        const { currentPositions } = this.#store.state.getValue();
        return OperationRealTimeUtil.filterOperationCurrentPositionsThatShouldUpdate(
            currentPositions,
        );
    }

    get isEnableAutoReload(): boolean {
        const { isEnableAutoReload } = this.#store.state.getValue();
        return isEnableAutoReload;
    }
}
