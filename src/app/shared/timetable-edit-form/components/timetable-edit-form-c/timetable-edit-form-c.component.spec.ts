import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimetableEditFormCComponent } from './timetable-edit-form-c.component';

describe('TimetableEditFormCComponent', () => {
    let component: TimetableEditFormCComponent;
    let fixture: ComponentFixture<TimetableEditFormCComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [TimetableEditFormCComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(TimetableEditFormCComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
