import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { ServiceListStateQuery } from 'src/app/global-states/service-list.state';
import { CalendarService } from 'src/app/libs/calendar/usecase/calendar.service';
import { OperationService } from 'src/app/libs/operation/usecase/operation.service';
import { ServiceService } from 'src/app/libs/service/usecase/service.service';
import { TripBlockService } from 'src/app/libs/trip-block/usecase/trip-block.service';
import { TripClassService } from 'src/app/libs/trip-class/usecase/trip-class.service';
import { ETripDirection } from 'src/app/libs/trip/special/enums/trip.enum';
import { ETimetableEditFormMode } from '../special/enums/timetable-edit-form.enum';
import { TimetableEditFormStore } from '../stores/timetable-edit-form.store';
import { TimetableEditFormService } from './timetable-edit-form.service';

describe('TimetableEditFormService', () => {
    let service: TimetableEditFormService;
    let tripBlockService: {
        findOneById: jest.Mock;
        findManyByFilter: jest.Mock;
        createMany: jest.Mock;
        replaceOne: jest.Mock;
    };

    beforeEach(() => {
        tripBlockService = {
            findOneById: jest.fn(() => of({ tripBlockId: 'block-1', trips: [] })),
            findManyByFilter: jest.fn(() => of([])),
            createMany: jest.fn(() => of([])),
            replaceOne: jest.fn(() => of({})),
        };

        TestBed.configureTestingModule({
            providers: [
                TimetableEditFormService,
                { provide: ServiceService, useValue: {} },
                { provide: CalendarService, useValue: {} },
                { provide: OperationService, useValue: {} },
                { provide: TripClassService, useValue: {} },
                { provide: TripBlockService, useValue: tripBlockService },
                {
                    provide: ServiceListStateQuery,
                    useValue: { serviceId: 'service-1' },
                },
            ],
        });
        service = TestBed.inject(TimetableEditFormService);

        TimetableEditFormStore.setMode(ETimetableEditFormMode.COPY);
        TimetableEditFormStore.setCalendarId('calendar-1');
        TimetableEditFormStore.setTripDirection(ETripDirection.OUTBOUND);
        TimetableEditFormStore.setTripBlockId(null);
        TimetableEditFormStore.setTargetTripBlock(null);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('B8-3: selectCopySource はコピー元 trip-block を取得しストアへ反映する', (done) => {
        service.selectCopySource('block-1').subscribe(() => {
            expect(tripBlockService.findOneById).toHaveBeenCalledWith({
                id: 'block-1',
            });
            expect(TimetableEditFormStore.tripBlockId).toBe('block-1');
            done();
        });
    });

    it('selectCopySource(null) はコピー元選択を解除する', (done) => {
        service.selectCopySource(null).subscribe(() => {
            expect(tripBlockService.findOneById).not.toHaveBeenCalled();
            expect(TimetableEditFormStore.tripBlockId).toBeNull();
            done();
        });
    });

    it('fetchCopySourceCandidates は calendarId + tripDirection で候補一覧を取得する', (done) => {
        service.fetchCopySourceCandidates().subscribe(() => {
            expect(tripBlockService.findManyByFilter).toHaveBeenCalledWith({
                calendarId: 'calendar-1',
                tripDirection: ETripDirection.OUTBOUND,
            });
            done();
        });
    });

    it('下書き: getMatchingDraft はコンテキスト不一致なら null を返す', () => {
        expect(service.getMatchingDraft()).toBeNull();
    });

    it('下書き: saveDraft → getMatchingDraft で往復できる', () => {
        service.saveDraft([{ tripNumber: '123' }]);
        const draft = service.getMatchingDraft();
        expect(draft).not.toBeNull();
        expect(draft?.trips).toEqual([{ tripNumber: '123' }]);
        service.clearDraft();
        expect(service.getMatchingDraft()).toBeNull();
    });
});
