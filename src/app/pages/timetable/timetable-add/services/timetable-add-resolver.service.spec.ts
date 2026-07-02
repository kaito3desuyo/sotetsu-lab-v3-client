import { TestBed, inject } from '@angular/core/testing';

import { TimetableEditFormService } from 'src/app/shared/timetable-edit-form/services/timetable-edit-form.service';
import { TimetableEditFormStateStore } from 'src/app/shared/timetable-edit-form/states/timetable-edit-form.state';
import { TimetableAddResolverService } from './timetable-add-resolver.service';

describe('Service: TimetableAddResolver', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                TimetableAddResolverService,
                { provide: TimetableEditFormService, useValue: {} },
                { provide: TimetableEditFormStateStore, useValue: {} },
            ],
        });
    });

    it('should ...', inject(
        [TimetableAddResolverService],
        (service: TimetableAddResolverService) => {
            expect(service).toBeTruthy();
        },
    ));
});
