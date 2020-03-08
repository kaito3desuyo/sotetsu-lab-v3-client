import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { OperationTableSearchFormContainerComponent } from './operation-table-search-form-container.component';

describe('OperationTableSearchFormContainerComponent', () => {
  let component: OperationTableSearchFormContainerComponent;
  let fixture: ComponentFixture<OperationTableSearchFormContainerComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ OperationTableSearchFormContainerComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(OperationTableSearchFormContainerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
