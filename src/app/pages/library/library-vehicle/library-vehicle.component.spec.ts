import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { LibraryVehicleComponent } from './library-vehicle.component';

describe('LibraryVehicleComponent', () => {
  let component: LibraryVehicleComponent;
  let fixture: ComponentFixture<LibraryVehicleComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ LibraryVehicleComponent ]
    })
    .compileComponents();
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
