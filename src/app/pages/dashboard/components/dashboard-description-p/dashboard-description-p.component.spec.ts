import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardDescriptionPComponent } from './dashboard-description-p.component';

describe('DashboardDescriptionPComponent', () => {
    let component: DashboardDescriptionPComponent;
    let fixture: ComponentFixture<DashboardDescriptionPComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [DashboardDescriptionPComponent],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(DashboardDescriptionPComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
