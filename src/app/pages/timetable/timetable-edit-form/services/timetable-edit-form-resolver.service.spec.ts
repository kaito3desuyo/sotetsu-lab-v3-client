/* eslint-disable no-unused-vars */

import { TestBed, inject } from '@angular/core/testing';
import { TimetableEditFormResolverService } from './timetable-edit-form-resolver.service';

describe('Service: TimetableEditFormResolver', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [TimetableEditFormResolverService],
        });
    });

    it('should be created', inject(
        [TimetableEditFormResolverService],
        (service: TimetableEditFormResolverService) => {
            expect(service).toBeTruthy();
        },
    ));
});
