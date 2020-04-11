import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SidenavPresentationalComponent } from './sidenav-presentational.component';

describe('SidenavPresentationalComponent', () => {
    let component: SidenavPresentationalComponent;
    let fixture: ComponentFixture<SidenavPresentationalComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [SidenavPresentationalComponent],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(SidenavPresentationalComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
