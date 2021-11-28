import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OperationSearchCardCComponent } from './operation-search-card-c.component';

describe('OperationSearchCardCComponent', () => {
  let component: OperationSearchCardCComponent;
  let fixture: ComponentFixture<OperationSearchCardCComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ OperationSearchCardCComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(OperationSearchCardCComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
