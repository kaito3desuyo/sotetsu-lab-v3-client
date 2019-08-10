/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { CalenderApiService } from './calender-api.service';

describe('Service: CalenderApi', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CalenderApiService]
    });
  });

  it('should ...', inject([CalenderApiService], (service: CalenderApiService) => {
    expect(service).toBeTruthy();
  }));
});
