/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { OperationTableResolverService } from './operation-table-resolver.service';

describe('Service: OperationTableResolver', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [OperationTableResolverService]
    });
  });

  it('should ...', inject([OperationTableResolverService], (service: OperationTableResolverService) => {
    expect(service).toBeTruthy();
  }));
});
