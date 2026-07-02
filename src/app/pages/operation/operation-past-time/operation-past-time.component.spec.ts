import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { EMPTY } from 'rxjs';

import { OperationSearchCardService } from 'src/app/shared/operation-search-card/services/operation-search-card.service';
import { OperationPastTimeComponent } from './operation-past-time.component';

describe('OperationPastTimeComponent', () => {
    let component: OperationPastTimeComponent;
    let fixture: ComponentFixture<OperationPastTimeComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [OperationPastTimeComponent],
            providers: [
                provideRouter([]),
                {
                    provide: OperationSearchCardService,
                    useValue: {
                        receiveSearchOperationTableEvent: () => EMPTY,
                        receiveSearchOperationRouteDiagramEvent: () => EMPTY,
                    },
                },
            ],
        })
            .overrideComponent(OperationPastTimeComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();

        fixture = TestBed.createComponent(OperationPastTimeComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
