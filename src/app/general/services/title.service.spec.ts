/* tslint:disable:no-unused-variable */

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
