/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { TimetableAllLineTableResolverService } from './timetable-all-line-table-resolver.service';

describe('Service: TimetableAllLineTableResolver', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [TimetableAllLineTableResolverService]
        });
    });

    it('should ...', inject(
        [TimetableAllLineTableResolverService],
        (service: TimetableAllLineTableResolverService) => {
            expect(service).toBeTruthy();
        }
    ));
});
