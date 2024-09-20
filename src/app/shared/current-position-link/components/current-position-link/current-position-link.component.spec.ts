import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CurrentPositionLinkComponent } from './current-position-link.component';

describe('CurrentPositionLinkComponent', () => {
    let component: CurrentPositionLinkComponent;
    let fixture: ComponentFixture<CurrentPositionLinkComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [CurrentPositionLinkComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(CurrentPositionLinkComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
