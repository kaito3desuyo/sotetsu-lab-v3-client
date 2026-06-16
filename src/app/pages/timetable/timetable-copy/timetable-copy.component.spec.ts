import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { TimetableCopyComponent } from './timetable-copy.component';

describe('TimetableCopyComponent', () => {
    let component: TimetableCopyComponent;
    let fixture: ComponentFixture<TimetableCopyComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TimetableCopyComponent],
            providers: [provideRouter([])],
        })
            .overrideComponent(TimetableCopyComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();

        fixture = TestBed.createComponent(TimetableCopyComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
