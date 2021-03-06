import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { HeaderPresentationalComponent } from './header-presentational.component';

describe('HeaderPresentationalComponent', () => {
    let component: HeaderPresentationalComponent;
    let fixture: ComponentFixture<HeaderPresentationalComponent>;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            declarations: [HeaderPresentationalComponent],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(HeaderPresentationalComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
