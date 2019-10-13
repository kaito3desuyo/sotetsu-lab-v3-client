/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { DashboardTimetableSearchFormContainerComponent } from './dashboard-timetable-search-form-container.component';

describe('DashboardTimetableSearchFormContainerComponent', () => {
  let component: DashboardTimetableSearchFormContainerComponent;
  let fixture: ComponentFixture<DashboardTimetableSearchFormContainerComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DashboardTimetableSearchFormContainerComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardTimetableSearchFormContainerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
