import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { LibraryVehicleComponent } from './library-vehicle.component';

describe('LibraryVehicleComponent', () => {
    let component: LibraryVehicleComponent;
    let fixture: ComponentFixture<LibraryVehicleComponent>;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            declarations: [LibraryVehicleComponent],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(LibraryVehicleComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
