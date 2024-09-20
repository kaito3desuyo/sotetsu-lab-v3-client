import { TestBed } from '@angular/core/testing';

import { TimetableCopyService } from './timetable-copy.service';

describe('TimetableCopyService', () => {
    let service: TimetableCopyService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(TimetableCopyService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });
});
