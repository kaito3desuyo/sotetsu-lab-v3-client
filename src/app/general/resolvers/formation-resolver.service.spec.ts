/* eslint-disable no-unused-vars, @typescript-eslint/no-unused-vars */

import { TestBed, inject, waitForAsync } from '@angular/core/testing';
import { FormationResolverService } from './formation-resolver.service';

describe('Service: FormationResolver', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [FormationResolverService],
        });
    });

    it('should ...', inject(
        [FormationResolverService],
        (service: FormationResolverService) => {
            expect(service).toBeTruthy();
        }
    ));
});
