import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { UserState } from 'src/app/global-states/user.state';
import { OperationPostDialogService } from 'src/app/shared/operation-post-dialog/operation-post-dialog.service';
import { OperationRealTimeSightingCallComponent } from './operation-real-time-sighting-call.component';

describe('OperationRealTimeSightingCallComponent', () => {
    let fixture: ComponentFixture<OperationRealTimeSightingCallComponent>;
    const open = jest.fn();
    const isLoggedIn = signal(true);
    const isViewer = signal(false);

    const root = () => fixture.nativeElement as HTMLElement;
    const chips = () =>
        Array.from(root().querySelectorAll<HTMLButtonElement>('button'));

    const setup = (operations: { operationNumber: string }[]) => {
        fixture = TestBed.createComponent(
            OperationRealTimeSightingCallComponent,
        );
        fixture.componentRef.setInput('operations', operations);
        fixture.detectChanges();
    };

    beforeEach(async () => {
        open.mockClear();
        isLoggedIn.set(true);
        isViewer.set(false);
        await TestBed.configureTestingModule({
            imports: [OperationRealTimeSightingCallComponent],
            providers: [
                provideRouter([]),
                { provide: UserState, useValue: { isLoggedIn, isViewer } },
                { provide: OperationPostDialogService, useValue: { open } },
            ],
        }).compileComponents();
    });

    it('対象が 0 件なら何も描かない', () => {
        setup([]);

        expect(root().children.length).toBe(0);
        expect(root().textContent?.trim()).toBe('');
    });

    it('運用番号のチップを並べ、押すと運用番号を入れて投稿ダイアログを開く', () => {
        setup([{ operationNumber: '12K' }, { operationNumber: '58S' }]);

        expect(root()).toHaveTextContent(/目撃募集/);
        expect(root()).toHaveTextContent(
            /いま走っていて、今日まだ目撃の無い運用/,
        );
        expect(chips().map((b) => b.textContent?.trim())).toEqual([
            '12K',
            '58S',
        ]);
        expect(chips()[0]).toHaveAttribute(
            'aria-label',
            '12K の目撃を投稿する',
        );
        expect(chips()[0]).toHaveAttribute('type', 'button');
        // preflight が無いので、字をアプリの字にそろえないとブラウザ既定のボタンの字になる
        expect(chips()[0]).toHaveClass('tw-font-[inherit]');

        chips()[1].click();

        expect(open).toHaveBeenCalledWith({ operationNumber: '58S' });
    });

    it('ゲストがチップを押すと /login?return_to=… へ送る', async () => {
        isLoggedIn.set(false);
        const router = TestBed.inject(Router);
        const navigate = jest.spyOn(router, 'navigate').mockResolvedValue(true);
        jest.spyOn(router, 'url', 'get').mockReturnValue(
            '/operation/real-time?x=1',
        );
        setup([{ operationNumber: '12K' }]);

        chips()[0].click();

        expect(open).not.toHaveBeenCalled();
        expect(navigate).toHaveBeenCalledWith(['/login'], {
            queryParams: { return_to: '/operation/real-time?x=1' },
        });
    });

    it('viewer には描かない', () => {
        isViewer.set(true);
        setup([{ operationNumber: '12K' }]);

        expect(chips().length).toBe(0);
        expect(root().textContent?.trim()).toBe('');
    });
});
