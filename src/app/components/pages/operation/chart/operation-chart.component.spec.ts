/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { OperationChartComponent } from './operation-chart.component';

describe('OperationChartComponent', () => {
  let component: OperationChartComponent;
  let fixture: ComponentFixture<OperationChartComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ OperationChartComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(OperationChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
