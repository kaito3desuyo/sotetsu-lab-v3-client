import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { CollapsiblePanelComponent } from './collapsible-panel.component';

@Component({
    template: `
        <app-collapsible-panel label="表示設定" [summary]="summary">
            <p class="projected">中身</p>
        </app-collapsible-panel>
    `,
    imports: [CollapsiblePanelComponent],
})
class HostComponent {
    summary = '本線 / 7:00〜8:00';
}

function mockMatchMedia(matches: boolean): void {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockReturnValue({ matches }),
    });
}

describe('CollapsiblePanelComponent', () => {
    let fixture: ComponentFixture<HostComponent>;

    async function setup(matchesDesktop: boolean): Promise<void> {
        mockMatchMedia(matchesDesktop);
        await TestBed.configureTestingModule({
            imports: [HostComponent],
        }).compileComponents();
        fixture = TestBed.createComponent(HostComponent);
        fixture.detectChanges();
    }

    function panel(): CollapsiblePanelComponent {
        return fixture.debugElement.query(
            By.directive(CollapsiblePanelComponent),
        ).componentInstance;
    }

    function contentEl(): HTMLElement {
        return fixture.nativeElement.querySelector(
            '[data-testid="collapsible-panel-content"]',
        );
    }

    function summaryEl(): HTMLElement | null {
        return fixture.nativeElement.querySelector(
            '[data-testid="collapsible-panel-summary"]',
        );
    }

    function headerButton(): HTMLButtonElement {
        return fixture.nativeElement.querySelector('button');
    }

    it('デスクトップ（sm 以上）では既定で展開される', async () => {
        await setup(true);
        expect(panel().expanded()).toBe(true);
        expect(contentEl().classList).not.toContain('tw-hidden');
    });

    it('モバイル（sm 未満）では既定で折り畳まれる', async () => {
        await setup(false);
        expect(panel().expanded()).toBe(false);
        expect(contentEl().classList).toContain('tw-hidden');
    });

    it('ヘッダークリックで開閉が切り替わる', async () => {
        await setup(true);
        headerButton().click();
        fixture.detectChanges();
        expect(panel().expanded()).toBe(false);
        expect(contentEl().classList).toContain('tw-hidden');

        headerButton().click();
        fixture.detectChanges();
        expect(panel().expanded()).toBe(true);
        expect(contentEl().classList).not.toContain('tw-hidden');
    });

    it('折り畳み時のみ要約をヘッダーに表示する', async () => {
        await setup(false);
        expect(summaryEl()?.textContent).toContain('本線 / 7:00〜8:00');

        headerButton().click();
        fixture.detectChanges();
        expect(summaryEl()).toBeNull();
    });

    it('折り畳んでも投影コンテンツは DOM から破棄されない', async () => {
        await setup(false);
        expect(
            fixture.nativeElement.querySelector('.projected'),
        ).not.toBeNull();
    });

    it('aria-expanded が開閉状態に追従する', async () => {
        await setup(true);
        expect(headerButton().getAttribute('aria-expanded')).toBe('true');
        headerButton().click();
        fixture.detectChanges();
        expect(headerButton().getAttribute('aria-expanded')).toBe('false');
    });
});
