import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfirmDialogHeaderCComponent } from './confirm-dialog-header-c.component';

describe('ConfirmDialogHeaderCComponent', () => {
  let component: ConfirmDialogHeaderCComponent;
  let fixture: ComponentFixture<ConfirmDialogHeaderCComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ConfirmDialogHeaderCComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConfirmDialogHeaderCComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
