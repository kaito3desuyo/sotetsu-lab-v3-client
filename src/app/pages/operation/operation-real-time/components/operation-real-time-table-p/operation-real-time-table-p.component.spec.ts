import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OperationRealTimeTablePComponent } from './operation-real-time-table-p.component';

describe('OperationRealTimeTablePComponent', () => {
  let component: OperationRealTimeTablePComponent;
  let fixture: ComponentFixture<OperationRealTimeTablePComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ OperationRealTimeTablePComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(OperationRealTimeTablePComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
