import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimetableCopyMainCComponent } from './timetable-copy-main-c.component';

describe('TimetableCopyMainCComponent', () => {
  let component: TimetableCopyMainCComponent;
  let fixture: ComponentFixture<TimetableCopyMainCComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TimetableCopyMainCComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TimetableCopyMainCComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
