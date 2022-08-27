import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CalendarSelectDialogHeaderPComponent } from './calendar-select-dialog-header-p.component';

describe('CalendarSelectDialogHeaderPComponent', () => {
  let component: CalendarSelectDialogHeaderPComponent;
  let fixture: ComponentFixture<CalendarSelectDialogHeaderPComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CalendarSelectDialogHeaderPComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CalendarSelectDialogHeaderPComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
