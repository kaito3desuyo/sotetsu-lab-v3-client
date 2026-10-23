import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { PrivacyPolicyComponent } from './privacy-policy.component';

describe('PrivacyPolicyComponent', () => {
    let component: PrivacyPolicyComponent;
    let fixture: ComponentFixture<PrivacyPolicyComponent>;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            imports: [PrivacyPolicyComponent],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(PrivacyPolicyComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('見出しに「プライバシーポリシー」が描かれる', () => {
        const heading = (fixture.nativeElement as HTMLElement).querySelector(
            'h2',
        );
        expect(heading?.textContent).toContain('プライバシーポリシー');
    });
});
