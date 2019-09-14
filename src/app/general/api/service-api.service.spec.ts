/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { ServiceApiService } from './service-api.service';

describe('Service: ServiceApi', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ServiceApiService]
    });
  });

  it('should ...', inject([ServiceApiService], (service: ServiceApiService) => {
    expect(service).toBeTruthy();
  }));
});
