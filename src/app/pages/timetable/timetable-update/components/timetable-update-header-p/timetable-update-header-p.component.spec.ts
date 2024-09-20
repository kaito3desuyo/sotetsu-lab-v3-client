import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimetableUpdateHeaderPComponent } from './timetable-update-header-p.component';

describe('TimetableUpdateHeaderPComponent', () => {
    let component: TimetableUpdateHeaderPComponent;
    let fixture: ComponentFixture<TimetableUpdateHeaderPComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [TimetableUpdateHeaderPComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(TimetableUpdateHeaderPComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
