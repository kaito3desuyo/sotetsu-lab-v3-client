import { FetchError } from 'src/app/core/classes/custom-error';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';
import { UserStateQuery } from 'src/app/global-states/user.state';
import { OperationSightingService } from 'src/app/libs/operation-sighting/usecase/operation-sighting.service';
import { OperationSightingRestorationDialogComponent } from './operation-sighting-restoration-dialog.component';

describe('OperationSightingRestorationDialogComponent', () => {
    let component: OperationSightingRestorationDialogComponent;
    let fixture: ComponentFixture<OperationSightingRestorationDialogComponent>;
    let restore: jest.Mock;
    let close: jest.Mock;
    let snackBarOpen: jest.Mock;

    beforeEach(async () => {
        restore = jest.fn(() => of(undefined));
        close = jest.fn();
        snackBarOpen = jest.fn();
        jest.spyOn(console, 'error').mockImplementation(() => undefined);

        await TestBed.configureTestingModule({
            imports: [OperationSightingRestorationDialogComponent],
            providers: [
                {
                    provide: MAT_DIALOG_DATA,
                    useValue: { operationSightingId: 's-1' },
                },
                { provide: MatDialogRef, useValue: { close } },
                { provide: OperationSightingService, useValue: { restore } },
                { provide: UserStateQuery, useValue: { userId: 'u-1' } },
            ],
        })
            .overrideComponent(OperationSightingRestorationDialogComponent, {
                set: { template: '', imports: [] },
            })
            .overrideProvider(MatSnackBar, {
                useValue: { open: snackBarOpen },
            })
            .compileComponents();

        fixture = TestBed.createComponent(
            OperationSightingRestorationDialogComponent,
        );
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('渡された目撃を、ログイン中のユーザーと理由で復元し、true で閉じる', async () => {
        component.form.setValue({ reason: '正しい目撃だった' });

        await component.onClickSubmit();

        expect(restore).toHaveBeenCalledWith({
            operationSightingId: 's-1',
            userId: 'u-1',
            reason: '正しい目撃だった',
        });
        expect(snackBarOpen).toHaveBeenCalledWith(
            '復元に成功しました。',
            '閉じる',
            { duration: 3000 },
        );
        expect(close).toHaveBeenCalledWith(true);
    });

    it('失敗したら知らせて、閉じない', async () => {
        restore.mockReturnValue(
            throwError(() => new FetchError(500, '不明なエラーが発生しました')),
        );

        await component.onClickSubmit();

        expect(snackBarOpen).toHaveBeenCalledWith(
            '復元に失敗しました。',
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
