import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimetableUpdateMainCComponent } from './timetable-update-main-c.component';

describe('TimetableUpdateMainCComponent', () => {
  let component: TimetableUpdateMainCComponent;
  let fixture: ComponentFixture<TimetableUpdateMainCComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TimetableUpdateMainCComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TimetableUpdateMainCComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
