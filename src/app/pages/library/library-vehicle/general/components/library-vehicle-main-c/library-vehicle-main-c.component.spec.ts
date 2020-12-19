import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { LibraryVehicleMainCComponent } from './library-vehicle-main-c.component';

describe('LibraryVehicleMainCComponent', () => {
  let component: LibraryVehicleMainCComponent;
  let fixture: ComponentFixture<LibraryVehicleMainCComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ LibraryVehicleMainCComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LibraryVehicleMainCComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
