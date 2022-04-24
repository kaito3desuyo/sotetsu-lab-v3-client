import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimetableStationMainCComponent } from './timetable-station-main-c.component';

describe('TimetableStationMainCComponent', () => {
  let component: TimetableStationMainCComponent;
  let fixture: ComponentFixture<TimetableStationMainCComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TimetableStationMainCComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TimetableStationMainCComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
