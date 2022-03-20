import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OperationTableHeaderPComponent } from './operation-table-header-p.component';

describe('OperationTableHeaderPComponent', () => {
  let component: OperationTableHeaderPComponent;
  let fixture: ComponentFixture<OperationTableHeaderPComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ OperationTableHeaderPComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(OperationTableHeaderPComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
