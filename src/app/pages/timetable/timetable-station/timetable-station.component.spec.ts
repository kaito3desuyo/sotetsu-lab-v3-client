import { provideHttpClient, withXhr } from '@angular/common/http';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
    ActivatedRoute,
    convertToParamMap,
    provideRouter,
    Router,
} from '@angular/router';
import { of } from 'rxjs';

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

describe('TimetableStationComponent の URL の向き', () => {
    it('向きが読めない URL は、無いときと同じく上りに置き換える', async () => {
        const params = {
            calendar_id: 'cal-1',
            station_id: 'st-1',
            trip_direction: 'abc',
        };
        await TestBed.configureTestingModule({
            imports: [TimetableStationComponent],
            providers: [
                provideRouter([]),
                {
                    provide: ActivatedRoute,
                    useValue: { paramMap: of(convertToParamMap(params)) },
                },
                { provide: TimetableStationService, useValue: {} },
                { provide: NotificationService, useValue: { open: () => {} } },
            ],
        })
            .overrideComponent(TimetableStationComponent, {
                set: { template: '', imports: [] },
            })
            .compileComponents();
        const navigate = jest
            .spyOn(TestBed.inject(Router), 'navigate')
            .mockResolvedValue(true);

        TestBed.createComponent(TimetableStationComponent);

        expect(navigate).toHaveBeenCalledWith(
            [
                'timetable',
                'station',
                {
                    calendar_id: 'cal-1',
                    station_id: 'st-1',
                    trip_direction: '0',
                },
            ],
            { replaceUrl: true },
        );
    });
});
