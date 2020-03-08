import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { OperationRouteDiagramSearchFormPresentationalComponent } from './operation-route-diagram-search-form-presentational.component';

describe('OperationRouteDiagramSearchFormPresentationalComponent', () => {
  let component: OperationRouteDiagramSearchFormPresentationalComponent;
  let fixture: ComponentFixture<OperationRouteDiagramSearchFormPresentationalComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ OperationRouteDiagramSearchFormPresentationalComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(OperationRouteDiagramSearchFormPresentationalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
