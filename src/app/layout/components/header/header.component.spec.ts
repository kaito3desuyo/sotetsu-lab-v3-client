import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { HeaderComponent } from './header.component';

describe('HeaderComponent', () => {
    let component: HeaderComponent;
    let fixture: ComponentFixture<HeaderComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [HeaderComponent],
            providers: [provideHttpClient()],
        }).compileComponents();

        fixture = TestBed.createComponent(HeaderComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('pageTitle 未指定時はロゴ表記「Sotetsu Lab.」を表示する', () => {
        fixture.detectChanges();

        const h1: HTMLElement = fixture.nativeElement.querySelector('h1');
        expect(h1.textContent?.trim()).toBe('Sotetsu Lab.');
    });

    it('pageTitle 指定時はツールバーにページ名を表示する', () => {
        fixture.componentRef.setInput('pageTitle', 'ダイヤグラム');
        fixture.detectChanges();

        const h1: HTMLElement = fixture.nativeElement.querySelector('h1');
        expect(h1.textContent?.trim()).toBe('ダイヤグラム');
        expect(fixture.nativeElement.textContent).not.toContain(
            'Sotetsu Lab.',
        );
    });
});
