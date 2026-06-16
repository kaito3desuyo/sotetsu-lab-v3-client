import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { TimetableUpdateComponent } from './timetable-update.component';

describe('TimetableUpdateComponent', () => {
    let component: TimetableUpdateComponent;
    let fixture: ComponentFixture<TimetableUpdateComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TimetableUpdateComponent],
            providers: [provideRouter([])],
        })
            .overrideComponent(TimetableUpdateComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();

        fixture = TestBed.createComponent(TimetableUpdateComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
