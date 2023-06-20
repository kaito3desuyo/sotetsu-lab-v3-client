import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OperationRealTimeNewTableByOperationCComponent } from './operation-real-time-new-table-by-operation-c.component';

describe('OperationRealTimeNewTableByOperationCComponent', () => {
  let component: OperationRealTimeNewTableByOperationCComponent;
  let fixture: ComponentFixture<OperationRealTimeNewTableByOperationCComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ OperationRealTimeNewTableByOperationCComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OperationRealTimeNewTableByOperationCComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
