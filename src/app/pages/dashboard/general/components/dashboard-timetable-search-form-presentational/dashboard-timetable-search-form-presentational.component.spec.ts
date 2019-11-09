/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { DashboardTimetableSearchFormPresentationalComponent } from './dashboard-timetable-search-form-presentational.component';

describe('DashboardTimetableSearchFormPresentationalComponent', () => {
  let component: DashboardTimetableSearchFormPresentationalComponent;
  let fixture: ComponentFixture<DashboardTimetableSearchFormPresentationalComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DashboardTimetableSearchFormPresentationalComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardTimetableSearchFormPresentationalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
