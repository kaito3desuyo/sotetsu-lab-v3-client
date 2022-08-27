import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimetableAllLineMainCComponent } from './timetable-all-line-main-c.component';

describe('TimetableAllLineMainCComponent', () => {
  let component: TimetableAllLineMainCComponent;
  let fixture: ComponentFixture<TimetableAllLineMainCComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TimetableAllLineMainCComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TimetableAllLineMainCComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
