import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { OperationRouteDiagramSearchFormContainerComponent } from './operation-route-diagram-search-form-container.component';

describe('OperationRouteDiagramSearchFormContainerComponent', () => {
  let component: OperationRouteDiagramSearchFormContainerComponent;
  let fixture: ComponentFixture<OperationRouteDiagramSearchFormContainerComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ OperationRouteDiagramSearchFormContainerComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(OperationRouteDiagramSearchFormContainerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
