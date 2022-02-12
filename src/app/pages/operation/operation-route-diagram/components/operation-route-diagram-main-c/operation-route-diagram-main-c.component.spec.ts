import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OperationRouteDiagramMainCComponent } from './operation-route-diagram-main-c.component';

describe('OperationRouteDiagramMainCComponent', () => {
  let component: OperationRouteDiagramMainCComponent;
  let fixture: ComponentFixture<OperationRouteDiagramMainCComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ OperationRouteDiagramMainCComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(OperationRouteDiagramMainCComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
