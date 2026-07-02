import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { EMPTY } from 'rxjs';

import { OperationSearchCardService } from 'src/app/shared/operation-search-card/services/operation-search-card.service';
import { OperationTableComponent } from './operation-table.component';

describe('OperationTableComponent', () => {
    let component: OperationTableComponent;
    let fixture: ComponentFixture<OperationTableComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [OperationTableComponent],
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
            .overrideComponent(OperationTableComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();

        fixture = TestBed.createComponent(OperationTableComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
