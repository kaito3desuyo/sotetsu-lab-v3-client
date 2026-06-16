import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RxState } from '@rx-angular/state';
import { EMPTY } from 'rxjs';

import { OperationSearchCardStateStore } from 'src/app/shared/operation-search-card/states/operation-search-card.state';
import { OperationRouteDiagramStateQuery } from '../../states/operation-route-diagram.state';
import { OperationRouteDiagramMainCComponent } from './operation-route-diagram-main-c.component';

describe('OperationRouteDiagramMainCComponent', () => {
    let component: OperationRouteDiagramMainCComponent;
    let fixture: ComponentFixture<OperationRouteDiagramMainCComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [OperationRouteDiagramMainCComponent],
        })
            .overrideComponent(OperationRouteDiagramMainCComponent, {
                set: {
                    imports: [],
                    schemas: [NO_ERRORS_SCHEMA],
                    providers: [
                        RxState,
                        {
                            provide: OperationRouteDiagramStateQuery,
                            useValue: {
                                calendar$: EMPTY,
                                operation$: EMPTY,
                            },
                        },
                        {
                            provide: OperationSearchCardStateStore,
                            useValue: {
                                setCalendarId: () => {},
                                setOperationId: () => {},
                            },
                        },
                    ],
                },
            })
            .compileComponents();

        fixture = TestBed.createComponent(OperationRouteDiagramMainCComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
