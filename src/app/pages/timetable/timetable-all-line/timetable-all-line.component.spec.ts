import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { EMPTY } from 'rxjs';

import { TimetableSearchCardService } from 'src/app/shared/timetable-search-card/services/timetable-search-card.service';
import { TimetableAllLineComponent } from './timetable-all-line.component';

describe('TimetableAllLineComponent', () => {
    let component: TimetableAllLineComponent;
    let fixture: ComponentFixture<TimetableAllLineComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TimetableAllLineComponent],
            providers: [
                provideRouter([]),
                {
                    provide: TimetableSearchCardService,
                    useValue: { receiveSearchTimetableEvent: () => EMPTY },
                },
            ],
        })
            .overrideComponent(TimetableAllLineComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();

        fixture = TestBed.createComponent(TimetableAllLineComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
