import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimetableAddMainCComponent } from './timetable-add-main-c.component';

describe('TimetableAddMainCComponent', () => {
    let component: TimetableAddMainCComponent;
    let fixture: ComponentFixture<TimetableAddMainCComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [TimetableAddMainCComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(TimetableAddMainCComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
