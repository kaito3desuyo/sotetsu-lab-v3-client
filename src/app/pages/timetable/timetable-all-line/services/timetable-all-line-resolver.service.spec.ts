import { TestBed } from '@angular/core/testing';

import { TimetableAllLineResolverService } from './timetable-all-line-resolver.service';

describe('TimetableAllLineResolverService', () => {
  let service: TimetableAllLineResolverService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TimetableAllLineResolverService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
