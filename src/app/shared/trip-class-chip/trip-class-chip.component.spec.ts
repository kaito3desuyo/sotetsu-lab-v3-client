import '@testing-library/jest-dom';
import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TripClassChipComponent } from './trip-class-chip.component';

@Component({
    template: `
        <app-trip-class-chip
            [label]="label()"
            [color]="color()"
            [size]="size()"
        ></app-trip-class-chip>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [TripClassChipComponent],
})
class HostComponent {
    readonly label = signal<string | null>('快速');
    readonly color = signal<string | null>('#3f51b5');
    readonly size = signal<'sm' | 'md'>('md');
}

describe('TripClassChipComponent', () => {
    let fixture: ComponentFixture<HostComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [HostComponent],
        }).compileComponents();
        fixture = TestBed.createComponent(HostComponent);
        fixture.detectChanges();
    });

    function chip(): HTMLElement {
        return fixture.nativeElement.querySelector('.trip-class-chip-label');
    }

    it('種別名と塗り色を描画する', () => {
        expect(chip().textContent.trim()).toBe('快速');
        expect(chip().style.backgroundColor).toBeTruthy();
    });

    it('系統サフィックス（…）は落として表示する', () => {
        fixture.componentInstance.label.set('特急（SO→TY）');
        fixture.detectChanges();
        expect(chip().textContent.trim()).toBe('特急');
    });

    // ユーザー指示 2026-08-22: 列車番号はチップに含めない
    it('列車番号は含めない（種別名のみ）', () => {
        fixture.componentInstance.label.set('快速');
        fixture.detectChanges();
        expect(chip().textContent.trim()).toBe('快速');
        expect(chip()).not.toHaveTextContent(/\d/);
    });

    it('色が無いときはグレーで塗る', () => {
        fixture.componentInstance.color.set(null);
        fixture.detectChanges();
        expect(chip().className).toContain('tw-bg-grey-500');
        expect(chip()).toHaveStyle({ backgroundColor: '' });
    });

    it('白文字と縁取り用クラスを常に持つ', () => {
        expect(chip().className).toContain('tw-text-white');
        expect(chip().className).toContain('trip-class-chip-label');
    });

    it('size=sm で密度の高い指定になる', () => {
        fixture.componentInstance.size.set('sm');
        fixture.detectChanges();
        expect(chip().className).toContain('tw-text-[10px]');
    });
});
