import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimetableCopyHeaderCComponent } from './timetable-copy-header-c.component';

describe('TimetableCopyHeaderCComponent', () => {
  let component: TimetableCopyHeaderCComponent;
  let fixture: ComponentFixture<TimetableCopyHeaderCComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TimetableCopyHeaderCComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TimetableCopyHeaderCComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
