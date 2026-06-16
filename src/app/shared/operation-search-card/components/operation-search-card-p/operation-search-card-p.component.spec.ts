import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { OperationSearchCardPComponent } from './operation-search-card-p.component';

describe('OperationSearchCardPComponent', () => {
    let component: OperationSearchCardPComponent;
    let fixture: ComponentFixture<OperationSearchCardPComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [OperationSearchCardPComponent],
            providers: [provideRouter([])],
        }).compileComponents();

        fixture = TestBed.createComponent(OperationSearchCardPComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
