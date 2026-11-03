import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { PageMeta } from 'src/app/core/ssr/page-meta';

import { PrivacyPolicyComponent } from './privacy-policy.component';

describe('PrivacyPolicyComponent', () => {
    let component: PrivacyPolicyComponent;
    let fixture: ComponentFixture<PrivacyPolicyComponent>;
    const pageMeta = { set: jest.fn() };

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            imports: [PrivacyPolicyComponent],
            providers: [{ provide: PageMeta, useValue: pageMeta }],
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

    it('題名・説明・URL を PageMeta に入れる', () => {
        expect(pageMeta.set).toHaveBeenCalledWith(
            expect.objectContaining({
                title: 'プライバシーポリシー',
                url: '/privacy-policy',
                description: expect.any(String),
            }),
        );
    });
});
