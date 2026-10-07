import { provideHttpClient, withXhr } from '@angular/common/http';
import { TestBed, inject } from '@angular/core/testing';
import { DashboardService } from './dashboard.service';

describe('Service: Dashboard', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(withXhr()), DashboardService],
        });
    });

    it('should ...', inject([DashboardService], (service: DashboardService) => {
        expect(service).toBeTruthy();
    }));
});
