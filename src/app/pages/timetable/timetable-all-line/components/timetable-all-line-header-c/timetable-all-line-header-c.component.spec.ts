import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimetableAllLineHeaderCComponent } from './timetable-all-line-header-c.component';

describe('TimetableAllLineHeaderCComponent', () => {
    let component: TimetableAllLineHeaderCComponent;
    let fixture: ComponentFixture<TimetableAllLineHeaderCComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [TimetableAllLineHeaderCComponent],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(TimetableAllLineHeaderCComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
