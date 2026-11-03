import '@testing-library/jest-dom';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ModerationConfirmDialogData } from './moderation-confirm-dialog.type';
import { ModerationConfirmDialogComponent } from './moderation-confirm-dialog.component';

describe('ModerationConfirmDialogComponent', () => {
    let fixture: ComponentFixture<ModerationConfirmDialogComponent>;
    let component: ModerationConfirmDialogComponent;
    let close: jest.Mock;

    async function render(
        overrides: Partial<ModerationConfirmDialogData> = {},
    ) {
        close = jest.fn();
        await TestBed.configureTestingModule({
            imports: [ModerationConfirmDialogComponent],
            providers: [
                {
                    provide: MAT_DIALOG_DATA,
                    useValue: {
                        title: 'まとめて無効にする',
                        lines: ['tetsu_x の投稿 11 件を無効にします。'],
                        reasonRequired: true,
                        confirmLabel: '無効にする',
                        ...overrides,
                    } satisfies ModerationConfirmDialogData,
                },
                { provide: MatDialogRef, useValue: { close } },
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(ModerationConfirmDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    }

    it('件数と対象の名前（lines）と理由の欄を出す', async () => {
        await render();

        const el = fixture.nativeElement as HTMLElement;
        expect(el).toHaveTextContent('tetsu_x の投稿 11 件を無効にします。');
        expect(el.querySelector('textarea')).not.toBeNull();
    });

    it('理由が必須のとき、空では確定できない', async () => {
        await render();

        expect(component.form.invalid).toBe(true);
        component.form.setValue({ reason: '荒らし' });
        expect(component.form.valid).toBe(true);
    });

    it('理由は 200 字まで', async () => {
        await render();

        component.form.setValue({ reason: 'あ'.repeat(200) });
        expect(component.form.valid).toBe(true);
        component.form.setValue({ reason: 'あ'.repeat(201) });
        expect(component.form.invalid).toBe(true);
    });

    it('理由が任意のとき、空でも確定できる', async () => {
        await render({ reasonRequired: false });

        expect(component.form.valid).toBe(true);
    });

    it('確定すると理由を返し、キャンセルは undefined で閉じる', async () => {
        await render();
        component.form.setValue({ reason: '  荒らし ' });

        component.onSubmit();
        expect(close).toHaveBeenCalledWith({ reason: '荒らし' });

        component.onCancel();
        expect(close).toHaveBeenLastCalledWith(undefined);
    });
});
