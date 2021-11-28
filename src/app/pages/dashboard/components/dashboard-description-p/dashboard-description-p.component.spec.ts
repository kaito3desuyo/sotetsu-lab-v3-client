import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardDescriptionPComponent } from './dashboard-description-p.component';

describe('DashboardDescriptionPComponent', () => {
  let component: DashboardDescriptionPComponent;
  let fixture: ComponentFixture<DashboardDescriptionPComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DashboardDescriptionPComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardDescriptionPComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
