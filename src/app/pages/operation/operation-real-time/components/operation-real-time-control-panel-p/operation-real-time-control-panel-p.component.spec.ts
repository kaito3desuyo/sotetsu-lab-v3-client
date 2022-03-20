import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OperationRealTimeControlPanelPComponent } from './operation-real-time-control-panel-p.component';

describe('OperationRealTimeControlPanelPComponent', () => {
  let component: OperationRealTimeControlPanelPComponent;
  let fixture: ComponentFixture<OperationRealTimeControlPanelPComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ OperationRealTimeControlPanelPComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(OperationRealTimeControlPanelPComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
