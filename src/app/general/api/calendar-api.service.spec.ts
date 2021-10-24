/* eslint-disable no-unused-vars, @typescript-eslint/no-unused-vars */

import { TestBed, inject, waitForAsync } from '@angular/core/testing';
import { CalendarApiService } from './calendar-api.service';

describe('Service: CalendarApi', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [CalendarApiService],
        });
    });

    it('should ...', inject(
        [CalendarApiService],
        (service: CalendarApiService) => {
            expect(service).toBeTruthy();
        }
    ));
});
