import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimetableCopyHeaderContainerComponent } from './timetable-copy-header-container.component';

describe('TimetableCopyHeaderContainerComponent', () => {
  let component: TimetableCopyHeaderContainerComponent;
  let fixture: ComponentFixture<TimetableCopyHeaderContainerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TimetableCopyHeaderContainerComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TimetableCopyHeaderContainerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
