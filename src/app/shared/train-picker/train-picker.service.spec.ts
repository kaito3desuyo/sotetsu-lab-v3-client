import { PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { DeviceStorage } from 'src/app/core/storage/device-storage';
import { TodaysCalendarListState } from 'src/app/global-states/todays-calendar-list.state';
import { TRIP_BLOCK_TIMELINE_FIELDS } from 'src/app/libs/trip-block/usecase/trip-block-fields';
import { TripBlockService } from 'src/app/libs/trip-block/usecase/trip-block.service';
import { TripClassService } from 'src/app/libs/trip-class/usecase/trip-class.service';
import { TrainPickerService } from './train-picker.service';
import { TrainPickerStore } from './train-picker.store';

describe('TrainPickerService', () => {
    let findManyByCalendarId: jest.Mock;
    let service: TrainPickerService;
    let store: InstanceType<typeof TrainPickerStore>;

    const setup = (calendarId: string | undefined) => {
        findManyByCalendarId = jest.fn(() =>
            of({ 0: [{ trips: [] }], 1: [{ trips: [] }] }),
        );
        TestBed.configureTestingModule({
            providers: [
                TrainPickerService,
                { provide: PLATFORM_ID, useValue: 'browser' },
                {
                    provide: DeviceStorage,
                    useValue: {
                        getItem: jest.fn().mockResolvedValue(null),
                        setItem: jest.fn().mockResolvedValue(undefined),
                    },
                },
                {
                    provide: TodaysCalendarListState,
                    useValue: { todaysCalendarId: signal(calendarId) },
                },
                {
                    provide: TripBlockService,
                    useValue: { findManyByCalendarId },
                },
                {
                    provide: TripClassService,
                    useValue: { findMany: () => of([]) },
                },
            ],
        });
        service = TestBed.inject(TrainPickerService);
        store = TestBed.inject(TrainPickerStore);
    };

    it('今日のダイヤの ID と時刻表用の項目で取り、上り下りを 1 本にしてストアへ入れる', () => {
        setup('cal-1');

        service.fetchTripBlocks().subscribe();

        expect(findManyByCalendarId).toHaveBeenCalledWith({
            calendarId: 'cal-1',
            fields: TRIP_BLOCK_TIMELINE_FIELDS,
        });
        expect(store.tripBlocks()).toHaveLength(2);
        expect(store.fetchFailed()).toBe(false);
    });

    it('今日のダイヤが無ければ取らずに fetchFailed を立てる', () => {
        setup(undefined);

        service.fetchTripBlocks().subscribe();

        expect(findManyByCalendarId).not.toHaveBeenCalled();
        expect(store.fetchFailed()).toBe(true);
    });
});
