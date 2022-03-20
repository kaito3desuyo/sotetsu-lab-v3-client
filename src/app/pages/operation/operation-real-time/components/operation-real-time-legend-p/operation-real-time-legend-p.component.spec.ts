import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OperationRealTimeLegendPComponent } from './operation-real-time-legend-p.component';

describe('OperationRealTimeLegendPComponent', () => {
  let component: OperationRealTimeLegendPComponent;
  let fixture: ComponentFixture<OperationRealTimeLegendPComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ OperationRealTimeLegendPComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(OperationRealTimeLegendPComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
