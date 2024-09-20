import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimetableAllLineHeaderPComponent } from './timetable-all-line-header-p.component';

describe('TimetableAllLineHeaderPComponent', () => {
    let component: TimetableAllLineHeaderPComponent;
    let fixture: ComponentFixture<TimetableAllLineHeaderPComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [TimetableAllLineHeaderPComponent],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(TimetableAllLineHeaderPComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
