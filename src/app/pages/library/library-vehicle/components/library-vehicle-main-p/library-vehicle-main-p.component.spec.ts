import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LibraryVehicleMainPComponent } from './library-vehicle-main-p.component';

describe('LibraryVehicleMainPComponent', () => {
    let component: LibraryVehicleMainPComponent;
    let fixture: ComponentFixture<LibraryVehicleMainPComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [LibraryVehicleMainPComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(LibraryVehicleMainPComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
