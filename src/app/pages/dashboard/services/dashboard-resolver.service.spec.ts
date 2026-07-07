import { provideHttpClient } from '@angular/common/http';
import { TestBed, inject } from '@angular/core/testing';
import { DashboardResolverService } from './dashboard-resolver.service';

describe('Service: DashboardResolver', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), DashboardResolverService],
        });
    });

    it('should ...', inject(
        [DashboardResolverService],
        (service: DashboardResolverService) => {
            expect(service).toBeTruthy();
        },
    ));
});
