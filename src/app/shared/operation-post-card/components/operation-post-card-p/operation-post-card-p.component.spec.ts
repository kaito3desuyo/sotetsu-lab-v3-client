import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OperationPostCardPComponent } from './operation-post-card-p.component';

describe('OperationPostCardPComponent', () => {
    let component: OperationPostCardPComponent;
    let fixture: ComponentFixture<OperationPostCardPComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [OperationPostCardPComponent],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(OperationPostCardPComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
