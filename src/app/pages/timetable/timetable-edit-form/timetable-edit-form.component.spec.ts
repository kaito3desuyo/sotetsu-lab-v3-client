import { provideHttpClient } from '@angular/common/http';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { EMPTY, of } from 'rxjs';

import { ErrorHandlerService } from 'src/app/core/services/error-handler.service';
import { ServiceListStateQuery } from 'src/app/global-states/service-list.state';
import { TimetableEditFormService } from './services/timetable-edit-form.service';
import { ETimetableEditFormMode } from './special/enums/timetable-edit-form.enum';
import { TimetableEditFormComponent } from './timetable-edit-form.component';

describe('TimetableEditFormComponent', () => {
    let component: TimetableEditFormComponent;
    let fixture: ComponentFixture<TimetableEditFormComponent>;
    let timetableEditFormService: Record<string, jest.Mock>;

    beforeEach(async () => {
        timetableEditFormService = {
            fetchStations: jest.fn(() => of(undefined)),
            fetchRoutes: jest.fn(() => of(undefined)),
            fetchOperations: jest.fn(() => of(undefined)),
            fetchTripClasses: jest.fn(() => of(undefined)),
            fetchCalendar: jest.fn(() => of(undefined)),
            fetchTargetTripBlock: jest.fn(() => of(undefined)),
            fetchCopySourceCandidates: jest.fn(() => of(undefined)),
            selectCopySource: jest.fn(() => of(undefined)),
            createTripBlocks: jest.fn(() => of(undefined)),
            replaceTripBlock: jest.fn(() => of(undefined)),
            receiveSubmittedEvent: jest.fn(() => EMPTY),
            emitSubmittedEvent: jest.fn(),
            saveDraft: jest.fn(),
            clearDraft: jest.fn(),
            getMatchingDraft: jest.fn(() => null),
        };

        await TestBed.configureTestingModule({
            imports: [TimetableEditFormComponent],
            providers: [
                provideHttpClient(),
                provideRouter([]),
                {
                    provide: ActivatedRoute,
                    useValue: {
                        paramMap: of(
                            new Map([
                                ['calendarId', 'calendar-1'],
                                ['trip_direction', '0'],
                            ]),
                        ),
                        snapshot: {
                            data: { mode: ETimetableEditFormMode.ADD },
                        },
                    },
                },
                {
                    provide: TimetableEditFormService,
                    useValue: timetableEditFormService,
                },
                {
                    provide: ServiceListStateQuery,
                    useValue: { serviceId$: of('service-1') },
                },
                {
                    provide: ErrorHandlerService,
                    useValue: { handleError: () => {} },
                },
            ],
        })
            .overrideComponent(TimetableEditFormComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();

        fixture = TestBed.createComponent(TimetableEditFormComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('B8-5: mode を route data から読み取り、フェッチ一式を呼び出す', () => {
        expect(timetableEditFormService.fetchStations).toHaveBeenCalled();
        expect(timetableEditFormService.fetchRoutes).toHaveBeenCalled();
        expect(timetableEditFormService.fetchCalendar).toHaveBeenCalled();
        expect(component.mode()).toBe(ETimetableEditFormMode.ADD);
    });
});
