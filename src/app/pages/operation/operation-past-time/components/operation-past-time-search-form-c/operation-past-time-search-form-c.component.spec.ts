import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OperationPastTimeSearchFormCComponent } from './operation-past-time-search-form-c.component';

describe('OperationPastTimeSearchFormCComponent', () => {
  let component: OperationPastTimeSearchFormCComponent;
  let fixture: ComponentFixture<OperationPastTimeSearchFormCComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [OperationPastTimeSearchFormCComponent]
    });
    fixture = TestBed.createComponent(OperationPastTimeSearchFormCComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
