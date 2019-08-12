/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { DashboardResolverService } from './dashboard-resolver.service';

describe('Service: DashboardResolver', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DashboardResolverService]
    });
  });

  it('should ...', inject([DashboardResolverService], (service: DashboardResolverService) => {
    expect(service).toBeTruthy();
  }));
});
