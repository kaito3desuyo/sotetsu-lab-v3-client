import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimetableAddHeaderPComponent } from './timetable-add-header-p.component';

describe('TimetableAddHeaderPComponent', () => {
  let component: TimetableAddHeaderPComponent;
  let fixture: ComponentFixture<TimetableAddHeaderPComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TimetableAddHeaderPComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TimetableAddHeaderPComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
