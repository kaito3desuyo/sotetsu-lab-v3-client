/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { DashboardOperationSightingAddFormContainerComponent } from './dashboard-operation-sighting-add-form-container.component';

describe('DashboardOperationSightingAddFormContainerComponent', () => {
  let component: DashboardOperationSightingAddFormContainerComponent;
  let fixture: ComponentFixture<DashboardOperationSightingAddFormContainerComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DashboardOperationSightingAddFormContainerComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardOperationSightingAddFormContainerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
