import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimetableAllLineTableCComponent } from './timetable-all-line-table-c.component';

describe('TimetableAllLineTableCComponent', () => {
    let component: TimetableAllLineTableCComponent;
    let fixture: ComponentFixture<TimetableAllLineTableCComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [TimetableAllLineTableCComponent],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(TimetableAllLineTableCComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
