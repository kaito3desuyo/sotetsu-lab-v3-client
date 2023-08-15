import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OperationPastTimeSearchFormPComponent } from './operation-past-time-search-form-p.component';

describe('OperationPastTimeSearchFormPComponent', () => {
  let component: OperationPastTimeSearchFormPComponent;
  let fixture: ComponentFixture<OperationPastTimeSearchFormPComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [OperationPastTimeSearchFormPComponent]
    });
    fixture = TestBed.createComponent(OperationPastTimeSearchFormPComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
