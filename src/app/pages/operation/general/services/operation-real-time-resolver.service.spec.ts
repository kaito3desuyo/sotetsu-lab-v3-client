/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { OperationRealTimeResolverService } from './operation-real-time-resolver.service';

describe('Service: OperationRealTimeResolver', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [OperationRealTimeResolverService]
    });
  });

  it('should ...', inject([OperationRealTimeResolverService], (service: OperationRealTimeResolverService) => {
    expect(service).toBeTruthy();
  }));
});
