import { TestBed } from '@angular/core/testing';

import { TimetableUpdateService } from './timetable-update.service';

describe('TimetableUpdateService', () => {
  let service: TimetableUpdateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TimetableUpdateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
