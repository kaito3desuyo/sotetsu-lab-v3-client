import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimetableStationHeaderCComponent } from './timetable-station-header-c.component';

describe('TimetableStationHeaderCComponent', () => {
  let component: TimetableStationHeaderCComponent;
  let fixture: ComponentFixture<TimetableStationHeaderCComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TimetableStationHeaderCComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TimetableStationHeaderCComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
