import { TestBed } from '@angular/core/testing';

import { CalendarSelectDialogService } from './calendar-select-dialog.service';

describe('CalendarSelectDialogService', () => {
    let service: CalendarSelectDialogService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(CalendarSelectDialogService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });
});
