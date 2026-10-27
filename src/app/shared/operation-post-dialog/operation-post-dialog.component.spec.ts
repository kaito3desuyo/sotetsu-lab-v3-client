import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';
import { NavigationStart, Router } from '@angular/router';
import { of, Subject } from 'rxjs';
import { ErrorHandlerService } from 'src/app/core/services/error-handler.service';
import { GoogleAnalyticsService } from 'src/app/core/services/google-analytics.service';
import { SocketService } from 'src/app/core/services/socket.service';
import { LoadingService } from '../loading/loading.service';
import { OperationPostCardService } from '../operation-post-card/operation-post-card.service';
import { OperationPostFormComponent } from '../operation-post-card/operation-post-form.component';
import {
    OPERATION_POST_DIALOG_TITLE_ID,
    OperationPostDialogComponent,
} from './operation-post-dialog.component';

describe('OperationPostDialogComponent', () => {
    let fixture: ComponentFixture<OperationPostDialogComponent>;
    const close = jest.fn();
    const dialogRef = { close, disableClose: false };
    let routerEvents: Subject<NavigationStart>;

    beforeEach(async () => {
        close.mockClear();
        routerEvents = new Subject();
        dialogRef.disableClose = false;
        await TestBed.configureTestingModule({
            imports: [OperationPostDialogComponent],
            providers: [
                { provide: MatDialogRef, useValue: dialogRef },
                {
                    provide: Router,
                    useValue: { events: routerEvents, url: '/' },
                },
                {
                    provide: MAT_DIALOG_DATA,
                    useValue: { operationNumber: '11' },
                },
                {
                    provide: OperationPostCardService,
                    useValue: {
                        fetchServiceAgencies: () => of(undefined),
                        postOperationSighting: jest.fn(() => of(undefined)),
                        emitSubmitEvent: jest.fn(),
                    },
                },
                {
                    provide: LoadingService,
                    useValue: { open: jest.fn(), close: jest.fn() },
                },
                {
                    provide: ErrorHandlerService,
                    useValue: { handleError: jest.fn() },
                },
                { provide: SocketService, useValue: { emit: jest.fn() } },
                {
                    provide: GoogleAnalyticsService,
                    useValue: { sendEvent: jest.fn() },
                },
            ],
        })
            .overrideComponent(OperationPostFormComponent, {
                set: { template: '', imports: [], providers: [] },
            })
            .compileComponents();
        fixture = TestBed.createComponent(OperationPostDialogComponent);
        fixture.detectChanges();
    });

    it('受け取った値をフォームに渡す', () => {
        const form = fixture.debugElement.query(
            By.directive(OperationPostFormComponent),
        ).componentInstance as OperationPostFormComponent;
        expect(form.initialValue()).toEqual({ operationNumber: '11' });
    });

    it('投稿に成功したら閉じる', () => {
        const form = fixture.debugElement.query(
            By.directive(OperationPostFormComponent),
        ).componentInstance as OperationPostFormComponent;
        form.submitted.emit();
        expect(close).toHaveBeenCalledTimes(1);
    });

    it('× で閉じる', () => {
        const button = (fixture.nativeElement as HTMLElement).querySelector(
            'button[aria-label="投稿ダイアログを閉じる"]',
        ) as HTMLButtonElement;
        button.click();
        expect(close).toHaveBeenCalledTimes(1);
    });

    it('送っている間は Esc・背景で閉じない', () => {
        const form = fixture.debugElement.query(
            By.directive(OperationPostFormComponent),
        ).componentInstance as OperationPostFormComponent;
        form.submittingChange.emit(true);
        expect(dialogRef.disableClose).toBe(true);
        form.submittingChange.emit(false);
        expect(dialogRef.disableClose).toBe(false);
    });

    it('見出しの id でダイアログの名前を付ける', () => {
        const heading = (fixture.nativeElement as HTMLElement).querySelector(
            'h2',
        ) as HTMLElement;
        expect(heading.id).toBe(OPERATION_POST_DIALOG_TITLE_ID);
    });

    it('画面遷移が始まったら閉じる（ゲストが「ログイン」を押したとき）', () => {
        routerEvents.next(new NavigationStart(1, '/login'));
        expect(close).toHaveBeenCalledTimes(1);
    });
});
