/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { OperationSightingsTableByDateContainerComponent } from './operation-sightings-table-by-date-container.component';

describe('OperationSightingsTableByDateContainerComponent', () => {
  let component: OperationSightingsTableByDateContainerComponent;
  let fixture: ComponentFixture<OperationSightingsTableByDateContainerComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ OperationSightingsTableByDateContainerComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(OperationSightingsTableByDateContainerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
