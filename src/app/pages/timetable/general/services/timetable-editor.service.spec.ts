/* eslint-disable no-unused-vars, @typescript-eslint/no-unused-vars */

import { TestBed, inject, waitForAsync } from '@angular/core/testing';
import { TimetableEditorService } from './timetable-editor.service';

describe('Service: TimetableEditor', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [TimetableEditorService],
        });
    });

    it('should ...', inject(
        [TimetableEditorService],
        (service: TimetableEditorService) => {
            expect(service).toBeTruthy();
        }
    ));
});
