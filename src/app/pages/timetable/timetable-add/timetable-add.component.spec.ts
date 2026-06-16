import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { TimetableAddComponent } from './timetable-add.component';

describe('TimetableAddComponent', () => {
    let component: TimetableAddComponent;
    let fixture: ComponentFixture<TimetableAddComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TimetableAddComponent],
            providers: [provideRouter([])],
        })
            .overrideComponent(TimetableAddComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();

        fixture = TestBed.createComponent(TimetableAddComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
