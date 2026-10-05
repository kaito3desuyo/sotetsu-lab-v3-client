import '@testing-library/jest-dom';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppButtonComponent } from './app-button.component';

@Component({
    standalone: true,
    imports: [AppButtonComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <app-button [variant]="variant()">{{ label() }}</app-button>
    `,
})
class HostComponent {
    readonly variant = signal<'primary' | 'secondary'>('primary');
    readonly label = signal('この列車を登録');
}

describe('AppButtonComponent', () => {
    let component: AppButtonComponent;
    let fixture: ComponentFixture<AppButtonComponent>;

    function button(): HTMLButtonElement {
        return fixture.nativeElement.querySelector('button');
    }

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [AppButtonComponent],
        });

        fixture = TestBed.createComponent(AppButtonComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        fixture.detectChanges();
        expect(component).toBeTruthy();
    });

    // Material ラップ差し替えに伴い、色は mat-flat-button/mat-stroked-button の
    // 構造クラス（app-button.component.scss で上書き）で表現するため、
    // Tailwind の色クラスでなく本コンポーネント固有のバリアントクラスと
    // Material の構造クラスが付与されていることを確認する（正当な追随修正）
    it('既定（primary）は mat-flat-button によるオレンジ塗り全幅ボタンになる（98 G0-4）', () => {
        fixture.detectChanges();

        expect(button()).toHaveClass('app-button-primary');
        expect(button()).toHaveClass('mat-mdc-unelevated-button');
        expect(button()).toHaveClass('tw-w-full');
    });

    it('secondary は mat-stroked-button による白地紺枠 outlined ボタンになる', () => {
        fixture.componentRef.setInput('variant', 'secondary');
        fixture.detectChanges();

        expect(button()).toHaveClass('app-button-secondary');
        expect(button()).toHaveClass('mat-mdc-outlined-button');
    });

    it('type を submit にすると button[type=submit] になる', () => {
        fixture.componentRef.setInput('type', 'submit');
        fixture.detectChanges();

        expect(button().type).toBe('submit');
    });

    it('クリックすると buttonClick が発火する', () => {
        fixture.detectChanges();

        let emitted = false;
        component.buttonClick.subscribe(() => (emitted = true));

        button().click();

        expect(emitted).toBe(true);
    });

    it('disabled のときは非活性になる', () => {
        fixture.componentRef.setInput('disabled', true);
        fixture.detectChanges();

        expect(button().disabled).toBe(true);
    });

    // G9 defect 1 回帰防止: 補間（バインディング付き）の投影内容が
    // primary/secondary いずれの変種でも空にならず描画されること。
    // ng-content を @if/@else 各ブランチへ二重に置いていた旧実装では
    // primary のラベルが空になっていた。
    describe('補間された投影内容が変種によらず描画される（defect 1 回帰防止）', () => {
        let host: ComponentFixture<HostComponent>;

        beforeEach(() => {
            host = TestBed.createComponent(HostComponent);
        });

        it('primary 変種でも投影ラベルが空にならない', () => {
            host.componentInstance.variant.set('primary');
            host.detectChanges();

            const btn: HTMLButtonElement =
                host.nativeElement.querySelector('button');
            expect(btn).toHaveClass('app-button-primary');
            expect(btn.textContent?.trim()).toBe('この列車を登録');
        });

        it('secondary 変種でも投影ラベルが空にならない', () => {
            host.componentInstance.variant.set('secondary');
            host.detectChanges();

            const btn: HTMLButtonElement =
                host.nativeElement.querySelector('button');
            expect(btn).toHaveClass('app-button-secondary');
            expect(btn.textContent?.trim()).toBe('この列車を登録');
        });

        it('投影ラベルの補間が更新されると再描画される', () => {
            host.componentInstance.variant.set('primary');
            host.detectChanges();

            host.componentInstance.label.set('この列車を更新');
            host.detectChanges();

            const btn: HTMLButtonElement =
                host.nativeElement.querySelector('button');
            expect(btn.textContent?.trim()).toBe('この列車を更新');
        });
    });
});
