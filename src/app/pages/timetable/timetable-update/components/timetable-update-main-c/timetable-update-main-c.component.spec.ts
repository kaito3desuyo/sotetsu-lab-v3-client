import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimetableUpdateMainCComponent } from './timetable-update-main-c.component';

describe('TimetableUpdateMainCComponent', () => {
    let component: TimetableUpdateMainCComponent;
    let fixture: ComponentFixture<TimetableUpdateMainCComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TimetableUpdateMainCComponent],
        })
            .overrideComponent(TimetableUpdateMainCComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();

        fixture = TestBed.createComponent(TimetableUpdateMainCComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
