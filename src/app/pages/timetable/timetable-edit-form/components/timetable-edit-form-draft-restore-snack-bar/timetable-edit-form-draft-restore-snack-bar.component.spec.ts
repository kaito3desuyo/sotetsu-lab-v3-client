import { TestBed } from '@angular/core/testing';
import { MatSnackBarRef } from '@angular/material/snack-bar';
import { By } from '@angular/platform-browser';
import { TimetableEditFormDraftRestoreSnackBarComponent } from './timetable-edit-form-draft-restore-snack-bar.component';

describe('TimetableEditFormDraftRestoreSnackBarComponent', () => {
    let snackBarRef: { dismiss: jest.Mock; dismissWithAction: jest.Mock };

    function buttons() {
        const fixture = TestBed.createComponent(
            TimetableEditFormDraftRestoreSnackBarComponent,
        );
        fixture.detectChanges();
        return fixture.debugElement.queryAll(By.css('button'));
    }

    beforeEach(() => {
        snackBarRef = { dismiss: jest.fn(), dismissWithAction: jest.fn() };
        TestBed.configureTestingModule({
            imports: [TimetableEditFormDraftRestoreSnackBarComponent],
            providers: [{ provide: MatSnackBarRef, useValue: snackBarRef }],
        });
    });

    it('「閉じる」は復元せずに閉じる', () => {
        const [close] = buttons();
        expect(close.nativeElement.textContent.trim()).toBe('閉じる');

        close.nativeElement.click();

        expect(snackBarRef.dismiss).toHaveBeenCalled();
        expect(snackBarRef.dismissWithAction).not.toHaveBeenCalled();
    });

    it('「復元する」は操作として閉じる（開いた側が onAction で復元する）', () => {
        const [, restore] = buttons();
        expect(restore.nativeElement.textContent.trim()).toBe('復元する');

        restore.nativeElement.click();

        expect(snackBarRef.dismissWithAction).toHaveBeenCalled();
    });
});
