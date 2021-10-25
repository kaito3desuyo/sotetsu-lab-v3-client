/* eslint-disable no-unused-vars, @typescript-eslint/no-unused-vars */

import { TestBed, inject, waitForAsync } from '@angular/core/testing';
import { TitleService } from './title.service';

describe('Service: Title', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [TitleService],
        });
    });

    it('should ...', inject([TitleService], (service: TitleService) => {
        expect(service).toBeTruthy();
    }));
});
