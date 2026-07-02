import { TestBed } from '@angular/core/testing';

import { TimetableEditFormService } from 'src/app/shared/timetable-edit-form/services/timetable-edit-form.service';
import { TimetableEditFormStateStore } from 'src/app/shared/timetable-edit-form/states/timetable-edit-form.state';
import { TimetableUpdateResolverService } from './timetable-update-resolver.service';

describe('TimetableUpdateResolverService', () => {
    let service: TimetableUpdateResolverService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                TimetableUpdateResolverService,
                { provide: TimetableEditFormService, useValue: {} },
                { provide: TimetableEditFormStateStore, useValue: {} },
            ],
        });
        service = TestBed.inject(TimetableUpdateResolverService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });
});
