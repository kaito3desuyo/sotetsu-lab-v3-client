import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OperationSearchCardPComponent } from './operation-search-card-p.component';

describe('OperationSearchCardPComponent', () => {
    let component: OperationSearchCardPComponent;
    let fixture: ComponentFixture<OperationSearchCardPComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [OperationSearchCardPComponent],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(OperationSearchCardPComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
