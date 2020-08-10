import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { LibraryVehicleHeaderCComponent } from './library-vehicle-header-c.component';

describe('LibraryVehicleHeaderCComponent', () => {
  let component: LibraryVehicleHeaderCComponent;
  let fixture: ComponentFixture<LibraryVehicleHeaderCComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ LibraryVehicleHeaderCComponent ]
    })
    .compileComponents();
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
