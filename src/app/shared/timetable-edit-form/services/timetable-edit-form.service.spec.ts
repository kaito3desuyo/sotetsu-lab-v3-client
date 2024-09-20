import { TestBed } from '@angular/core/testing';

import { TimetableEditFormService } from './timetable-edit-form.service';

describe('TimetableEditFormService', () => {
    let service: TimetableEditFormService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(TimetableEditFormService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });
});
