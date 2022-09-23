import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfirmDialogHeaderPComponent } from './confirm-dialog-header-p.component';

describe('ConfirmDialogHeaderPComponent', () => {
  let component: ConfirmDialogHeaderPComponent;
  let fixture: ComponentFixture<ConfirmDialogHeaderPComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ConfirmDialogHeaderPComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConfirmDialogHeaderPComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
