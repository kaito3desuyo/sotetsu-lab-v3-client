import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { ConfirmDialogComponent } from './confirm-dialog.component';
import { IConfirmDialogData } from './interfaces/confirm-dialog-data.interface';

describe('ConfirmDialogComponent', () => {
    let fixture: ComponentFixture<ConfirmDialogComponent>;
    const dialogRef = { close: jest.fn() };

    async function setup(data: Partial<IConfirmDialogData>): Promise<void> {
        dialogRef.close.mockClear();
        await TestBed.configureTestingModule({
            imports: [ConfirmDialogComponent],
            providers: [
                {
                    provide: MAT_DIALOG_DATA,
                    useValue: {
                        title: '確認',
                        html: '<p>本文</p>',
                        cancelButtonText: 'やめる',
                        goButtonText: '進む',
                        ...data,
                    },
                },
                { provide: MatDialogRef, useValue: dialogRef },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(ConfirmDialogComponent);
        fixture.detectChanges();
    }

    function buttons(): HTMLButtonElement[] {
        return Array.from(fixture.nativeElement.querySelectorAll('button'));
    }

    it('見出しと本文とボタンの文言を出す', async () => {
        await setup({});
        const el: HTMLElement = fixture.nativeElement;

        expect(el.querySelector('h2')).toHaveTextContent('確認');
        expect(el.querySelector('p')).toHaveTextContent('本文');
        expect(buttons()[1]).toHaveTextContent('やめる');
        expect(buttons()[2]).toHaveTextContent('進む');
    });

    it('進むは true、やめる・閉じるは false で閉じる', async () => {
        await setup({});
        const [closeButton, cancelButton, goButton] = buttons();

        goButton.click();
        cancelButton.click();
        closeButton.click();

        expect(dialogRef.close.mock.calls).toEqual([[true], [false], [false]]);
    });

    it('進むが warn ならやめるにフォーカスする', async () => {
        await setup({ goButtonColor: 'warn' });
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(buttons()[1]).toHaveFocus();
    });

    it('進むが warn でなければ進むにフォーカスする', async () => {
        await setup({ goButtonColor: 'primary' });
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(buttons()[2]).toHaveFocus();
    });
});
