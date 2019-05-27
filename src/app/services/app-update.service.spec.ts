/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { AppUpdateService } from './app-update.service';

describe('Service: AppUpdate', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AppUpdateService]
    });
  });

  it('should ...', inject([AppUpdateService], (service: AppUpdateService) => {
    expect(service).toBeTruthy();
  }));
});
