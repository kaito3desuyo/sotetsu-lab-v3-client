import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimetableCalendarSelectDialogComponent } from './timetable-calendar-select-dialog.component';

describe('TimetableCalendarSelectDialogComponent', () => {
  let component: TimetableCalendarSelectDialogComponent;
  let fixture: ComponentFixture<TimetableCalendarSelectDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TimetableCalendarSelectDialogComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TimetableCalendarSelectDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
