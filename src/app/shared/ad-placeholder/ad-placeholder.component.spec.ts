import '@testing-library/jest-dom';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ADSENSE_TOKEN } from 'ng2-adsense';
import { AdPlaceholderComponent } from './ad-placeholder.component';

describe('AdPlaceholderComponent', () => {
    let component: AdPlaceholderComponent;
    let fixture: ComponentFixture<AdPlaceholderComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [AdPlaceholderComponent],
            providers: [
                {
                    provide: ADSENSE_TOKEN,
                    useValue: { adClient: 'ca-pub-test', fullWidthResponsive: false },
                },
            ],
        });

        fixture = TestBed.createComponent(AdPlaceholderComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('adSlot', 12345);
    });

    it('should create', () => {
        fixture.detectChanges();
        expect(component).toBeTruthy();
    });

    it('斜線パターンのプレースホルダに「広告」ラベルを表示する（98 G0-9）', () => {
        fixture.detectChanges();

        const text: string = fixture.nativeElement.textContent;
        expect(text).toContain('広告');
        expect(
            fixture.nativeElement.querySelector('.ad-placeholder-stripes'),
        ).toBeTruthy();
    });

    it('adSlot を ng-adsense に引き継ぐ', () => {
        fixture.detectChanges();

        const ins: HTMLElement = fixture.nativeElement.querySelector('ins');
        expect(ins).toHaveAttribute('data-ad-slot', '12345');
    });
});
