import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimetableCopyMainCComponent } from './timetable-copy-main-c.component';

describe('TimetableCopyMainCComponent', () => {
    let component: TimetableCopyMainCComponent;
    let fixture: ComponentFixture<TimetableCopyMainCComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TimetableCopyMainCComponent],
        })
            .overrideComponent(TimetableCopyMainCComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();

        fixture = TestBed.createComponent(TimetableCopyMainCComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
