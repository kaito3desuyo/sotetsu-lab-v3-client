/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { TimetableAllLineTablePresentationalComponent } from './timetable-all-line-table-presentational.component';

describe('TimetableAllLineTablePresentationalComponent', () => {
  let component: TimetableAllLineTablePresentationalComponent;
  let fixture: ComponentFixture<TimetableAllLineTablePresentationalComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TimetableAllLineTablePresentationalComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TimetableAllLineTablePresentationalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
