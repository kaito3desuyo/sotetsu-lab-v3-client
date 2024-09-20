import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimetableCopyHeaderPComponent } from './timetable-copy-header-p.component';

describe('TimetableCopyHeaderPComponent', () => {
    let component: TimetableCopyHeaderPComponent;
    let fixture: ComponentFixture<TimetableCopyHeaderPComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [TimetableCopyHeaderPComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(TimetableCopyHeaderPComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
