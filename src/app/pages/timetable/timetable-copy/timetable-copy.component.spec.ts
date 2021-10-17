import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimetableCopyComponent } from './timetable-copy.component';

describe('TimetableCopyComponent', () => {
  let component: TimetableCopyComponent;
  let fixture: ComponentFixture<TimetableCopyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TimetableCopyComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TimetableCopyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
