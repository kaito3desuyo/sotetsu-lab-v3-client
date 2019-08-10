/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { CalenderResolverService } from './calender-resolver.service';

describe('Service: CalenderResolver', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CalenderResolverService]
    });
  });

  it('should ...', inject([CalenderResolverService], (service: CalenderResolverService) => {
    expect(service).toBeTruthy();
  }));
});
