/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { TimetableStationService } from './timetable-station.service';

describe('Service: TimetableStation', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TimetableStationService]
    });
  });

  it('should ...', inject([TimetableStationService], (service: TimetableStationService) => {
    expect(service).toBeTruthy();
  }));
});
