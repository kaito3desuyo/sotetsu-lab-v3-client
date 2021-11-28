import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardMainCComponent } from './dashboard-main-c.component';

describe('DashboardMainCComponent', () => {
  let component: DashboardMainCComponent;
  let fixture: ComponentFixture<DashboardMainCComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DashboardMainCComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardMainCComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
