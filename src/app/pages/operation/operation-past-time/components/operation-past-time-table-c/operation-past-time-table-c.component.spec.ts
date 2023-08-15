import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OperationPastTimeTableCComponent } from './operation-past-time-table-c.component';

describe('OperationPastTimeTableCComponent', () => {
  let component: OperationPastTimeTableCComponent;
  let fixture: ComponentFixture<OperationPastTimeTableCComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [OperationPastTimeTableCComponent]
    });
    fixture = TestBed.createComponent(OperationPastTimeTableCComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
