import { computed } from '@angular/core';
import {
    patchState,
    signalStore,
    withComputed,
    withMethods,
    withState,
} from '@ngrx/signals';
import { withAppDevtools } from 'src/app/core/store-features/with-app-devtools';
import { withSettingsStorage } from 'src/app/core/store-features/with-settings-storage';
import { TripBlockDetailsDto } from 'src/app/libs/trip-block/usecase/dtos/trip-block-details.dto';
import { PickerDirection } from './pickable-train.interface';

const WIDEN_MINUTES = 10;
const DEFAULT_MINUTES = 10;

interface StoreProps {
    stationId: string | null;
    direction: PickerDirection;
    minutesBefore: number;
    minutesAfter: number;
    tripBlocks: TripBlockDetailsDto[];
    loadingQueue: boolean[];
    fetchFailed: boolean;
}

const initialState: StoreProps = {
    stationId: null,
    direction: 'both',
    minutesBefore: DEFAULT_MINUTES,
    minutesAfter: DEFAULT_MINUTES,
    tripBlocks: [],
    loadingQueue: [],
    fetchFailed: false,
};

export const TrainPickerStore = signalStore(
    { providedIn: 'root' },
    withState<StoreProps>(initialState),
    withComputed(({ loadingQueue }) => ({
        isLoading: computed(() => loadingQueue().length > 0),
    })),
    withMethods((store) => ({
        setStationId(stationId: string | null): void {
            patchState(store, { stationId });
        },
        setDirection(direction: PickerDirection): void {
            patchState(store, { direction });
        },
        widenBefore(): void {
            patchState(store, (s) => ({
                minutesBefore: s.minutesBefore + WIDEN_MINUTES,
            }));
        },
        widenAfter(): void {
            patchState(store, (s) => ({
                minutesAfter: s.minutesAfter + WIDEN_MINUTES,
            }));
        },
        resetWindow(): void {
            patchState(store, {
                minutesBefore: DEFAULT_MINUTES,
                minutesAfter: DEFAULT_MINUTES,
            });
        },
        setTripBlocks(tripBlocks: TripBlockDetailsDto[]): void {
            patchState(store, { tripBlocks });
        },
        setFetchFailed(fetchFailed: boolean): void {
            patchState(store, { fetchFailed });
        },
        enableLoading(): void {
            patchState(store, (s) => ({
                loadingQueue: s.loadingQueue.concat(true),
            }));
        },
        disableLoading(): void {
            patchState(store, (s) => ({
                loadingQueue: s.loadingQueue.slice(1),
            }));
        },
    })),
    withSettingsStorage<StoreProps>({
        key: 'TrainPickerStore',
        fields: ['stationId', 'direction'],
    }),
    withAppDevtools('TrainPickerStore'),
);
