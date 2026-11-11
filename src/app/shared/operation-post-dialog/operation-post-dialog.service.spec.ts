import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { OperationPostDialogComponent } from './operation-post-dialog.component';
import { OperationPostDialogService } from './operation-post-dialog.service';

describe('OperationPostDialogService', () => {
    const open = jest.fn();
    let service: OperationPostDialogService;

    beforeEach(() => {
        open.mockClear();
        TestBed.configureTestingModule({
            providers: [{ provide: MatDialog, useValue: { open } }],
        });
        service = TestBed.inject(OperationPostDialogService);
    });

    it('初期値なしで開くと initialValue は空', () => {
        service.open('realtime_fab');
        expect(open).toHaveBeenCalledWith(
            OperationPostDialogComponent,
            expect.objectContaining({
                data: { source: 'realtime_fab', initialValue: {} },
            }),
        );
    });

    it('開いた場所と初期値をそのまま data に渡す', () => {
        service.open('realtime_operation_card', { operationNumber: '11' });
        expect(open).toHaveBeenCalledWith(
            OperationPostDialogComponent,
            expect.objectContaining({
                data: {
                    source: 'realtime_operation_card',
                    initialValue: { operationNumber: '11' },
                },
            }),
        );
    });
});
