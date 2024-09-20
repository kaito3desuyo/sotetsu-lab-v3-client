import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LibraryVehicleHeaderPComponent } from './library-vehicle-header-p.component';

describe('LibraryVehicleHeaderPComponent', () => {
    let component: LibraryVehicleHeaderPComponent;
    let fixture: ComponentFixture<LibraryVehicleHeaderPComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [LibraryVehicleHeaderPComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(LibraryVehicleHeaderPComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
