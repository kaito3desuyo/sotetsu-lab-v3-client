import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RxState } from '@rx-angular/state';
import { EMPTY } from 'rxjs';

import { ErrorHandlerService } from 'src/app/core/services/error-handler.service';
import { TimetableAllLineService } from '../../services/timetable-all-line.service';
import {
    TimetableAllLineStateQuery,
    TimetableAllLineStateStore,
} from '../../states/timetable-all-line.state';
import { TimetableAllLineTableCComponent } from './timetable-all-line-table-c.component';

describe('TimetableAllLineTableCComponent', () => {
    let component: TimetableAllLineTableCComponent;
    let fixture: ComponentFixture<TimetableAllLineTableCComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TimetableAllLineTableCComponent],
            providers: [provideRouter([])],
        })
            .overrideComponent(TimetableAllLineTableCComponent, {
                set: {
                    imports: [],
                    schemas: [NO_ERRORS_SCHEMA],
                    providers: [
                        RxState,
                        { provide: ErrorHandlerService, useValue: { handleError: () => {} } },
                        { provide: TimetableAllLineService, useValue: {} },
                        { provide: TimetableAllLineStateStore, useValue: {} },
                        {
                            provide: TimetableAllLineStateQuery,
                            useValue: {
                                calendarId$: EMPTY,
                                tripDirection$: EMPTY,
                                stations$: EMPTY,
                                trips$: EMPTY,
                                pageSettings$: EMPTY,
                            },
                        },
                    ],
                },
            })
            .compileComponents();

        fixture = TestBed.createComponent(TimetableAllLineTableCComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
