/* eslint-disable no-unused-vars, @typescript-eslint/no-unused-vars */

import { TestBed, inject, waitForAsync } from '@angular/core/testing';
import { TimetableAllLineTableResolverService } from './timetable-all-line-table-resolver.service';

describe('Service: TimetableAllLineTableResolver', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [TimetableAllLineTableResolverService],
        });
    });

    it('should ...', inject(
        [TimetableAllLineTableResolverService],
        (service: TimetableAllLineTableResolverService) => {
            expect(service).toBeTruthy();
        }
    ));
});
