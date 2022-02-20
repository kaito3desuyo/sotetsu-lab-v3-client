import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OperationRouteDiagramHeaderPComponent } from './operation-route-diagram-header-p.component';

describe('OperationRouteDiagramHeaderPComponent', () => {
  let component: OperationRouteDiagramHeaderPComponent;
  let fixture: ComponentFixture<OperationRouteDiagramHeaderPComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ OperationRouteDiagramHeaderPComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(OperationRouteDiagramHeaderPComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
