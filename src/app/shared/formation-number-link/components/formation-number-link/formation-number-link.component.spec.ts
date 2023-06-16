import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FormationNumberLinkComponent } from './formation-number-link.component';

describe('FormationNumberLinkComponent', () => {
  let component: FormationNumberLinkComponent;
  let fixture: ComponentFixture<FormationNumberLinkComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ FormationNumberLinkComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FormationNumberLinkComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
