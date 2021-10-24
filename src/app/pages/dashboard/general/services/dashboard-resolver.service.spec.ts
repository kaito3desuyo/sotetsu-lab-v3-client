/* eslint-disable no-unused-vars, @typescript-eslint/no-unused-vars */

import { TestBed, inject, waitForAsync } from '@angular/core/testing';
import { DashboardResolverService } from './dashboard-resolver.service';

describe('Service: DashboardResolver', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [DashboardResolverService],
        });
    });

    it('should ...', inject(
        [DashboardResolverService],
        (service: DashboardResolverService) => {
            expect(service).toBeTruthy();
        }
    ));
});
