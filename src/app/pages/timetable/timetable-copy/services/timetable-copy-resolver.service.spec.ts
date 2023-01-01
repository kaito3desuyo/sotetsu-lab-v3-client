import { TestBed } from '@angular/core/testing';

import { TimetableCopyResolverService } from './timetable-copy-resolver.service';

describe('TimetableCopyResolverService', () => {
  let service: TimetableCopyResolverService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TimetableCopyResolverService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
