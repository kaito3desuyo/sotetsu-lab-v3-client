import { TestBed } from '@angular/core/testing';
import { lastValueFrom, of } from 'rxjs';
import { OperationSightingService } from 'src/app/libs/operation-sighting/usecase/operation-sighting.service';
import { OperationSightingTimeCrossSectionDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-time-cross-section.dto';
import { RouteService } from 'src/app/libs/route/usecase/route.service';
import { TripBlockService } from 'src/app/libs/trip-block/usecase/trip-block.service';
import { TripClassService } from 'src/app/libs/trip-class/usecase/trip-class.service';
import { TrainLocationStore } from '../stores/train-location.store';
import { TrainLocationService } from './train-location.service';

describe('TrainLocationService（時刻断面をまとめて取る）', () => {
    const findMany = jest.fn();
    let service: TrainLocationService;

    beforeEach(() => {
        findMany.mockReset();
        TestBed.configureTestingModule({
            providers: [
                TrainLocationService,
                {
                    provide: OperationSightingService,
                    useValue: {
                        findManyTimeCrossSectionsByOperationNumbers: findMany,
                    },
                },
                { provide: RouteService, useValue: {} },
                { provide: TripClassService, useValue: {} },
                { provide: TripBlockService, useValue: {} },
            ],
        });
        service = TestBed.inject(TrainLocationService);
    });

    it('まだ持っていない運用番号だけを 1 回で取り、番号ごとに store へ入れる', async () => {
        const cached = { latestSighting: null } as never;
        TrainLocationStore.setOperationSightingTimeCrossSection('11', cached);
        const crossSection = {
            latestSighting: null,
        } as unknown as OperationSightingTimeCrossSectionDto;
        findMany.mockReturnValue(of({ '12': crossSection }));

        await lastValueFrom(
            service.fetchMissingOperationSightingTimeCrossSections([
                '11',
                '12',
                '12',
            ]),
        );

        expect(findMany).toHaveBeenCalledTimes(1);
        expect(findMany).toHaveBeenCalledWith({ operationNumbers: ['12'] });
        expect(
            TrainLocationStore.operationSightingTimeCrossSections['12'],
        ).toBe(crossSection);
        expect(
            TrainLocationStore.operationSightingTimeCrossSections['11'],
        ).toBe(cached);
    });

    it('全部持っていれば取りに行かない', async () => {
        TrainLocationStore.setOperationSightingTimeCrossSection('13', {
            latestSighting: null,
        } as never);

        await lastValueFrom(
            service.fetchMissingOperationSightingTimeCrossSections(['13']),
        );

        expect(findMany).not.toHaveBeenCalled();
    });
});
