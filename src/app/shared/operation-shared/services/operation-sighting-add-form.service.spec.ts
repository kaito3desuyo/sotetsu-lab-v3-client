/* tslint:disable:no-unused-variable */

import { TestBed, inject, waitForAsync } from '@angular/core/testing';
import { OperationSightingAddFormService } from './operation-sighting-add-form.service';

describe('Service: OperationSightingAddForm', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [OperationSightingAddFormService],
        });
    });

    it('should ...', inject(
        [OperationSightingAddFormService],
        (service: OperationSightingAddFormService) => {
            expect(service).toBeTruthy();
        }
    ));
});
