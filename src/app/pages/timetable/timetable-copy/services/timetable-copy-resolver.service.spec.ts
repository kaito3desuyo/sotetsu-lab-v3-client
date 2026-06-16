import { TestBed } from '@angular/core/testing';

import { TimetableEditFormService } from 'src/app/shared/timetable-edit-form/services/timetable-edit-form.service';
import { TimetableEditFormStateStore } from 'src/app/shared/timetable-edit-form/states/timetable-edit-form.state';
import { TimetableCopyResolverService } from './timetable-copy-resolver.service';

describe('TimetableCopyResolverService', () => {
    let service: TimetableCopyResolverService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                TimetableCopyResolverService,
                { provide: TimetableEditFormService, useValue: {} },
                { provide: TimetableEditFormStateStore, useValue: {} },
            ],
        });
        service = TestBed.inject(TimetableCopyResolverService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });
});
