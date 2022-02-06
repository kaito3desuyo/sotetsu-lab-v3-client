import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OperationTableMainCComponent } from './operation-table-main-c.component';

describe('OperationTableMainCComponent', () => {
  let component: OperationTableMainCComponent;
  let fixture: ComponentFixture<OperationTableMainCComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ OperationTableMainCComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(OperationTableMainCComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
