/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { OperationTableService } from './operation-table.service';

describe('Service: OperationTable', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [OperationTableService]
    });
  });

  it('should ...', inject([OperationTableService], (service: OperationTableService) => {
    expect(service).toBeTruthy();
  }));
});
