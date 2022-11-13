import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimetableAddHeaderCComponent } from './timetable-add-header-c.component';

describe('TimetableAddHeaderCComponent', () => {
  let component: TimetableAddHeaderCComponent;
  let fixture: ComponentFixture<TimetableAddHeaderCComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TimetableAddHeaderCComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TimetableAddHeaderCComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
