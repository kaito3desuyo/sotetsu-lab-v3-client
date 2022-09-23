import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfirmDialogMainPComponent } from './confirm-dialog-main-p.component';

describe('ConfirmDialogMainPComponent', () => {
  let component: ConfirmDialogMainPComponent;
  let fixture: ComponentFixture<ConfirmDialogMainPComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ConfirmDialogMainPComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConfirmDialogMainPComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
