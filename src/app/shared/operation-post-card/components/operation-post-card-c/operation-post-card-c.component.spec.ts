import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OperationPostCardCComponent } from './operation-post-card-c.component';

describe('OperationPostCardCComponent', () => {
    let component: OperationPostCardCComponent;
    let fixture: ComponentFixture<OperationPostCardCComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [OperationPostCardCComponent],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(OperationPostCardCComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
