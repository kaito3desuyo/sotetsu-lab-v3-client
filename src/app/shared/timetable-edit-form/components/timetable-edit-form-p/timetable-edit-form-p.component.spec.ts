import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimetableEditFormPComponent } from './timetable-edit-form-p.component';

describe('TimetableEditFormPComponent', () => {
  let component: TimetableEditFormPComponent;
  let fixture: ComponentFixture<TimetableEditFormPComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TimetableEditFormPComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TimetableEditFormPComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
