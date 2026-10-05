import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { TimetableAllLineTableComponent } from './timetable-all-line-table.component';

describe('TimetableAllLineTableComponent', () => {
    let component: TimetableAllLineTableComponent;
    let fixture: ComponentFixture<TimetableAllLineTableComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TimetableAllLineTableComponent],
            providers: [provideRouter([])],
        })
            .overrideComponent(TimetableAllLineTableComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();

        fixture = TestBed.createComponent(TimetableAllLineTableComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('tripDirection', 1);
        fixture.componentRef.setInput('stations', []);
        fixture.componentRef.setInput('trips', []);
        fixture.componentRef.setInput('pageSettings', {
            pageIndex: 0,
            pageSize: 10,
            length: 0,
        });
        fixture.componentRef.setInput('viewModes', new Map());
        fixture.componentRef.setInput('bordersAfter', new Map());
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
