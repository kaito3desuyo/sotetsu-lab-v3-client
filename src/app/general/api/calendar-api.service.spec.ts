/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { CalendarApiService } from './calendar-api.service';

describe('Service: CalendarApi', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [CalendarApiService]
        });
    });

    it('should ...', inject(
        [CalendarApiService],
        (service: CalendarApiService) => {
            expect(service).toBeTruthy();
        }
    ));
});
