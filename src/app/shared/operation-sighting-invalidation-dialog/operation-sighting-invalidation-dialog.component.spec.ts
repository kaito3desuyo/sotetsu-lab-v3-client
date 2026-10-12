import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';
import { UserStateQuery } from 'src/app/global-states/user.state';
import { OperationSightingService } from 'src/app/libs/operation-sighting/usecase/operation-sighting.service';
import { OperationSightingInvalidationDialogComponent } from './operation-sighting-invalidation-dialog.component';

describe('OperationSightingInvalidationDialogComponent', () => {
    let component: OperationSightingInvalidationDialogComponent;
    let fixture: ComponentFixture<OperationSightingInvalidationDialogComponent>;
    let invalidate: jest.Mock;
    let close: jest.Mock;
    let snackBarOpen: jest.Mock;

    beforeEach(async () => {
        invalidate = jest.fn(() => of(undefined));
        close = jest.fn();
        snackBarOpen = jest.fn();
        jest.spyOn(console, 'error').mockImplementation(() => undefined);

        await TestBed.configureTestingModule({
            imports: [OperationSightingInvalidationDialogComponent],
            providers: [
                {
                    provide: MAT_DIALOG_DATA,
                    useValue: { operationSightingId: 's-1' },
                },
                { provide: MatDialogRef, useValue: { close } },
                { provide: OperationSightingService, useValue: { invalidate } },
                { provide: UserStateQuery, useValue: { userId: 'u-1' } },
            ],
        })
            .overrideComponent(OperationSightingInvalidationDialogComponent, {
                set: { template: '', imports: [] },
            })
            .overrideProvider(MatSnackBar, {
                useValue: { open: snackBarOpen },
            })
            .compileComponents();

        fixture = TestBed.createComponent(
            OperationSightingInvalidationDialogComponent,
        );
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('渡された目撃を、ログイン中のユーザーと理由で無効化し、true で閉じる', async () => {
        component.form.setValue({ reason: '誤投稿' });

        await component.onClickSubmit();

        expect(invalidate).toHaveBeenCalledWith({
            operationSightingId: 's-1',
            userId: 'u-1',
            reason: '誤投稿',
        });
        expect(snackBarOpen).toHaveBeenCalledWith(
            '無効化が完了しました',
            '閉じる',
            { duration: 3000 },
        );
        expect(close).toHaveBeenCalledWith(true);
    });

    it('失敗したら知らせて、閉じない', async () => {
        invalidate.mockReturnValue(
            throwError(() => new HttpErrorResponse({ status: 500 })),
        );

        await component.onClickSubmit();

        expect(snackBarOpen).toHaveBeenCalledWith(
            '無効化に失敗しました',
            '閉じる',
            { duration: 3000 },
        );
        expect(close).not.toHaveBeenCalled();
    });

    it('閉じるボタンでは false で閉じる', () => {
        component.onClickClose();

        expect(close).toHaveBeenCalledWith(false);
    });
});
