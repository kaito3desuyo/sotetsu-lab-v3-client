import { TestBed, inject } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';

import { ServiceListState } from 'src/app/global-states/service-list.state';
import { ServiceService } from 'src/app/libs/service/usecase/service.service';
import { TripBlockService } from 'src/app/libs/trip-block/usecase/trip-block.service';
import { TimetableAllLineStore } from '../stores/timetable-all-line.store';
import { TimetableAllLineService } from './timetable-all-line.service';

describe('Service: TimetableAllLine', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                TimetableAllLineService,
                { provide: ServiceService, useValue: {} },
                { provide: TripBlockService, useValue: {} },
                { provide: ServiceListState, useValue: {} },
            ],
        });
    });

    it('should be created', inject(
        [TimetableAllLineService],
        (service: TimetableAllLineService) => {
            expect(service).toBeTruthy();
        },
    ));
});

describe('Service: TimetableAllLine の fetchTripBlocks', () => {
    const tripBlockService = { findOneById: jest.fn() };

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                TimetableAllLineService,
                { provide: ServiceService, useValue: {} },
                { provide: TripBlockService, useValue: tripBlockService },
                { provide: ServiceListState, useValue: {} },
            ],
        });
    });

    it('trip_block_id の運行が無い（api が null を返す）ときは、空の配列を入れる', async () => {
        const store = TestBed.inject(TimetableAllLineStore);
        store.setTripBlockId('00000000-0000-4000-8000-0000000000b1');
        store.setTripBlocks([{ tripBlockId: 'old' }] as never);
        tripBlockService.findOneById.mockReturnValue(of(null));

        await firstValueFrom(
            TestBed.inject(TimetableAllLineService).fetchTripBlocks(),
        );

        expect(store.tripBlocks()).toEqual([]);
    });
});
