/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { TimetableUpdateHeaderContainerComponent } from './timetable-update-header-container.component';

describe('TimetableUpdateHeaderContainerComponent', () => {
  let component: TimetableUpdateHeaderContainerComponent;
  let fixture: ComponentFixture<TimetableUpdateHeaderContainerComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TimetableUpdateHeaderContainerComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TimetableUpdateHeaderContainerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
