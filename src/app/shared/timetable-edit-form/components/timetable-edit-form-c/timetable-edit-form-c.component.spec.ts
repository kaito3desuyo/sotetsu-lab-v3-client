import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EMPTY } from 'rxjs';

import { ErrorHandlerService } from 'src/app/core/services/error-handler.service';
import { TimetableEditFormService } from '../../services/timetable-edit-form.service';
import {
    TimetableEditFormStateQuery,
    TimetableEditFormStateStore,
} from '../../states/timetable-edit-form.state';
import { TimetableEditFormCComponent } from './timetable-edit-form-c.component';

describe('TimetableEditFormCComponent', () => {
    let component: TimetableEditFormCComponent;
    let fixture: ComponentFixture<TimetableEditFormCComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TimetableEditFormCComponent],
            providers: [
                { provide: ErrorHandlerService, useValue: { handleError: () => {} } },
                { provide: TimetableEditFormService, useValue: { receiveSubmittedEvent: () => EMPTY } },
                { provide: TimetableEditFormStateStore, useValue: {} },
                {
                    provide: TimetableEditFormStateQuery,
                    useValue: {
                        calendarId$: EMPTY,
                        mode$: EMPTY,
                        tripDirection$: EMPTY,
                        stations$: EMPTY,
                        operations$: EMPTY,
                        tripClasses$: EMPTY,
                        trips$: EMPTY,
                    },
                },
            ],
        })
            .overrideComponent(TimetableEditFormCComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();

        fixture = TestBed.createComponent(TimetableEditFormCComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
