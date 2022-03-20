import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OperationRouteDiagramHeaderCComponent } from './operation-route-diagram-header-c.component';

describe('OperationRouteDiagramHeaderCComponent', () => {
  let component: OperationRouteDiagramHeaderCComponent;
  let fixture: ComponentFixture<OperationRouteDiagramHeaderCComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ OperationRouteDiagramHeaderCComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(OperationRouteDiagramHeaderCComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
