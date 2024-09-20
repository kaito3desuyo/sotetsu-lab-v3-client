import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimetableUpdateHeaderCComponent } from './timetable-update-header-c.component';

describe('TimetableUpdateHeaderCComponent', () => {
    let component: TimetableUpdateHeaderCComponent;
    let fixture: ComponentFixture<TimetableUpdateHeaderCComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [TimetableUpdateHeaderCComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(TimetableUpdateHeaderCComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
