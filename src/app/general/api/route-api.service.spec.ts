/* tslint:disable:no-unused-variable */

import { TestBed, inject, waitForAsync } from '@angular/core/testing';
import { RouteApiService } from './route-api.service';

describe('Service: RouteApi', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [RouteApiService],
        });
    });

    it('should ...', inject([RouteApiService], (service: RouteApiService) => {
        expect(service).toBeTruthy();
    }));
});
