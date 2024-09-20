import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { LibraryVehicleHeaderCComponent } from './library-vehicle-header-c.component';

describe('LibraryVehicleHeaderCComponent', () => {
    let component: LibraryVehicleHeaderCComponent;
    let fixture: ComponentFixture<LibraryVehicleHeaderCComponent>;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            declarations: [LibraryVehicleHeaderCComponent],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(LibraryVehicleHeaderCComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
