/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { OperationRouteDiagramTitlePresentationalComponent } from './operation-route-diagram-title-presentational.component';

describe('OperationRouteDiagramTitlePresentationalComponent', () => {
  let component: OperationRouteDiagramTitlePresentationalComponent;
  let fixture: ComponentFixture<OperationRouteDiagramTitlePresentationalComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ OperationRouteDiagramTitlePresentationalComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(OperationRouteDiagramTitlePresentationalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
