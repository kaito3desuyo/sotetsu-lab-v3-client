import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CalendarSelectDialogMainCComponent } from './calendar-select-dialog-main-c.component';

describe('CalendarSelectDialogMainCComponent', () => {
  let component: CalendarSelectDialogMainCComponent;
  let fixture: ComponentFixture<CalendarSelectDialogMainCComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CalendarSelectDialogMainCComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CalendarSelectDialogMainCComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
