/* tslint:disable:no-unused-variable */

import { TestBed, inject, waitForAsync } from '@angular/core/testing';
import { DashboardService } from './dashboard.service';

describe('Service: Dashboard', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [DashboardService],
        });
    });

    it('should ...', inject([DashboardService], (service: DashboardService) => {
        expect(service).toBeTruthy();
    }));
});
