import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { DisclaimerComponent } from './disclaimer.component';

describe('DisclaimerComponent', () => {
    let component: DisclaimerComponent;
    let fixture: ComponentFixture<DisclaimerComponent>;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            imports: [DisclaimerComponent],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(DisclaimerComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('見出しに「免責事項」が描かれる', () => {
        const heading = (fixture.nativeElement as HTMLElement).querySelector(
            'h2',
        );
        expect(heading?.textContent).toContain('免責事項');
    });
});
