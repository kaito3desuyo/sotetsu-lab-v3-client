import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OperationRealTimeHeaderPComponent } from './operation-real-time-header-p.component';

describe('OperationRealTimeHeaderPComponent', () => {
  let component: OperationRealTimeHeaderPComponent;
  let fixture: ComponentFixture<OperationRealTimeHeaderPComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ OperationRealTimeHeaderPComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(OperationRealTimeHeaderPComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
