/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { TripOperationListApiService } from './trip-operation-list-api.service';

describe('Service: TripOperationListApi', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TripOperationListApiService]
    });
  });

  it('should ...', inject([TripOperationListApiService], (service: TripOperationListApiService) => {
    expect(service).toBeTruthy();
  }));
});
