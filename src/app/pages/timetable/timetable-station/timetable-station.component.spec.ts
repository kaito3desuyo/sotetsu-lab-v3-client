import { provideHttpClient, withXhr } from '@angular/common/http';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { NotificationService } from 'src/app/core/services/notification.service';
import { TimetableStationService } from './services/timetable-station.service';
import { TimetableStationComponent } from './timetable-station.component';

describe('TimetableStationComponent', () => {
    let component: TimetableStationComponent;
    let fixture: ComponentFixture<TimetableStationComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TimetableStationComponent],
            providers: [
                provideHttpClient(withXhr()),
                provideRouter([]),
                TimetableStationService,
                {
                    provide: NotificationService,
                    useValue: { open: () => {} },
                },
            ],
        })
            .overrideComponent(TimetableStationComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();

        fixture = TestBed.createComponent(TimetableStationComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
