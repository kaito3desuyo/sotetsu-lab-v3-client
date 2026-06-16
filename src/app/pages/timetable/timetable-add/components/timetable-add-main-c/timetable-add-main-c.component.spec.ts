import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimetableAddMainCComponent } from './timetable-add-main-c.component';

describe('TimetableAddMainCComponent', () => {
    let component: TimetableAddMainCComponent;
    let fixture: ComponentFixture<TimetableAddMainCComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TimetableAddMainCComponent],
        })
            .overrideComponent(TimetableAddMainCComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();

        fixture = TestBed.createComponent(TimetableAddMainCComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
