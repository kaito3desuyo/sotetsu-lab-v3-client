/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { OperationSightingsTableByOperationContainerComponent } from './operation-sightings-table-by-operation-container.component';

describe('OperationSightingsTableByOperationContainerComponent', () => {
  let component: OperationSightingsTableByOperationContainerComponent;
  let fixture: ComponentFixture<OperationSightingsTableByOperationContainerComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ OperationSightingsTableByOperationContainerComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(OperationSightingsTableByOperationContainerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
