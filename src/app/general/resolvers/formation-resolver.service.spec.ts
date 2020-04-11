/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
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
