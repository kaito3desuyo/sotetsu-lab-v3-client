/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { TimetableAllLinePaginatorPresentationalComponent } from './timetable-all-line-paginator-presentational.component';

describe('TimetableAllLinePaginatorPresentationalComponent', () => {
  let component: TimetableAllLinePaginatorPresentationalComponent;
  let fixture: ComponentFixture<TimetableAllLinePaginatorPresentationalComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TimetableAllLinePaginatorPresentationalComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TimetableAllLinePaginatorPresentationalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
