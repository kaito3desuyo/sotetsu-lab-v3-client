import { TestBed } from '@angular/core/testing';

import { OperationPostCardService } from './operation-post-card.service';

describe('OperationPostCardService', () => {
  let service: OperationPostCardService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OperationPostCardService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
