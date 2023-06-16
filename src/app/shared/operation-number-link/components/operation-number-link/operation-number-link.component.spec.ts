import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OperationNumberLinkComponent } from './operation-number-link.component';

describe('OperationNumberLinkComponent', () => {
    let component: OperationNumberLinkComponent;
    let fixture: ComponentFixture<OperationNumberLinkComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [OperationNumberLinkComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(OperationNumberLinkComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
