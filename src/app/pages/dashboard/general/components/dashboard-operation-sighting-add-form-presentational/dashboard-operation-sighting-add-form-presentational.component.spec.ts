/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { DashboardOperationSightingAddFormPresentationalComponent } from './dashboard-operation-sighting-add-form-presentational.component';

describe('DashboardOperationSightingAddFormPresentationalComponent', () => {
  let component: DashboardOperationSightingAddFormPresentationalComponent;
  let fixture: ComponentFixture<DashboardOperationSightingAddFormPresentationalComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DashboardOperationSightingAddFormPresentationalComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardOperationSightingAddFormPresentationalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
