/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { AppSharedService } from './app-shared.service';

describe('Service: AppShared', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AppSharedService]
    });
  });

  it('should ...', inject([AppSharedService], (service: AppSharedService) => {
    expect(service).toBeTruthy();
  }));
});
