import '@testing-library/jest-dom';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatMenuTrigger } from '@angular/material/menu';
import { provideRouter } from '@angular/router';
import { OperationNumberTagComponent } from './operation-number-tag.component';

describe('OperationNumberTagComponent', () => {
    let component: OperationNumberTagComponent;
    let fixture: ComponentFixture<OperationNumberTagComponent>;

    function getTagEl(): HTMLElement {
        return fixture.nativeElement.querySelector('a, span');
    }

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [OperationNumberTagComponent],
            providers: [provideRouter([])],
        }).compileComponents();

        fixture = TestBed.createComponent(OperationNumberTagComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        fixture.componentRef.setInput('operationNumber', '1001');
        fixture.detectChanges();
        expect(component).toBeTruthy();
    });

    it('無印運用番号は運用番号文字列をそのまま表示する', () => {
        fixture.componentRef.setInput('operationNumber', '1001');
        fixture.detectChanges();

        expect(getTagEl().textContent.trim()).toBe('1001');
    });

    it('先頭 1 の運用番号は赤系の群色背景になる', () => {
        fixture.componentRef.setInput('operationNumber', '1001');
        fixture.detectChanges();

        expect(getTagEl()).toHaveStyle({
            backgroundColor: 'rgba(244, 67, 54, 0.12)',
        });
    });

    it('G を含む運用番号は紺系の群色背景になる', () => {
        fixture.componentRef.setInput('operationNumber', '1G01');
        fixture.detectChanges();

        expect(getTagEl()).toHaveStyle({
            backgroundColor: 'rgba(26, 35, 126, 0.12)',
        });
    });

    it('K を含む運用番号は赤茶系の群色背景になる', () => {
        fixture.componentRef.setInput('operationNumber', '1K01');
        fixture.detectChanges();

        expect(getTagEl()).toHaveStyle({
            backgroundColor: 'rgba(183, 28, 28, 0.12)',
        });
    });

    it('運用番号 100（休車）は灰色背景になる', () => {
        fixture.componentRef.setInput('operationNumber', '100');
        fixture.detectChanges();

        expect(getTagEl()).toHaveStyle({
            backgroundColor: 'rgba(0, 0, 0, 0.12)',
        });
    });

    it('運用番号 100（休車）は「休」と出し、link があってもリンクにしない', () => {
        fixture.componentRef.setInput('operationNumber', '100');
        fixture.componentRef.setInput('link', ['/operation', 'route-diagram']);
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('a')).toBeNull();
        expect(getTagEl().textContent.trim()).toBe('休');
    });

    it('link 未指定時は a タグを描画しない', () => {
        fixture.componentRef.setInput('operationNumber', '1001');
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('a')).toBeNull();
        expect(fixture.nativeElement.querySelector('span')).not.toBeNull();
    });

    it('link 指定時は routerLink 付きの a タグを描画する', () => {
        fixture.componentRef.setInput('operationNumber', '1001');
        fixture.componentRef.setInput('link', [
            '/operation',
            'route-diagram',
            { operation_id: 123 },
        ]);
        fixture.detectChanges();

        const anchor: HTMLAnchorElement =
            fixture.nativeElement.querySelector('a');
        expect(anchor).not.toBeNull();
        expect(anchor).toHaveAttribute(
            'href',
            '/operation/route-diagram;operation_id=123',
        );
    });

    describe('borderEnabled（B9: 無効化済み目撃の赤枠表現）', () => {
        // 枠は inset の影で描く（border だと枠のあるタグだけ 2px 高くなるため）
        it('borderEnabled 指定時は枠色の inset の影が付き、border は使わない', () => {
            fixture.componentRef.setInput('operationNumber', '53');
            fixture.componentRef.setInput('borderEnabled', true);
            fixture.componentRef.setInput('borderColor', 'rgb(183, 28, 28)');
            fixture.detectChanges();

            const el = getTagEl();
            expect(el).toHaveStyle({
                boxShadow: 'inset 0 0 0 1px rgb(183, 28, 28)',
            });
            expect(el).not.toHaveClass('tw-border');
        });

        it('borderEnabled 未指定時は枠の影が付かない', () => {
            fixture.componentRef.setInput('operationNumber', '53');
            fixture.detectChanges();

            expect(getTagEl()).toHaveStyle({ boxShadow: '' });
        });
    });

    describe('contextMenus（B9: 右クリック/長押しコンテキストメニュー）', () => {
        let mockTrigger: { openMenu: jest.Mock };

        const touchAt = (x: number, y: number) =>
            ({
                touches: [{ clientX: x, clientY: y }],
            }) as unknown as TouchEvent;

        beforeEach(() => {
            mockTrigger = { openMenu: jest.fn() };
        });

        it('右クリックした座標にメニューの起点を置く', () => {
            fixture.componentRef.setInput('operationNumber', '1001');
            fixture.componentRef.setInput('contextMenus', [
                { icon: 'block', text: '無効化', onClick: () => {} },
            ]);
            fixture.detectChanges();

            component.onContextMenu(
                {
                    preventDefault: jest.fn(),
                    clientX: 320,
                    clientY: 480,
                } as unknown as MouseEvent,
                mockTrigger as unknown as MatMenuTrigger,
            );
            fixture.detectChanges();

            const trigger: HTMLButtonElement =
                fixture.nativeElement.querySelector('button[aria-hidden]');
            expect(trigger).toHaveStyle({ left: '320px' });
            expect(trigger).toHaveStyle({ top: '480px' });
        });

        it('長押しした座標にメニューの起点を置く', () => {
            fixture.componentRef.setInput('operationNumber', '1001');
            fixture.componentRef.setInput('contextMenus', [
                { icon: 'block', text: '無効化', onClick: () => {} },
            ]);
            fixture.detectChanges();

            component.onTouchStart(
                touchAt(120, 240),
                mockTrigger as unknown as MatMenuTrigger,
            );

            expect(component.menuPosition()).toEqual({ x: 120, y: 240 });
        });

        it('contextMenus 未指定時は右クリックしてもメニューを開かない', () => {
            fixture.componentRef.setInput('operationNumber', '1001');
            fixture.detectChanges();

            const event = {
                preventDefault: jest.fn(),
            } as unknown as MouseEvent;
            component.onContextMenu(
                event,
                mockTrigger as unknown as MatMenuTrigger,
            );

            expect(event.preventDefault).not.toHaveBeenCalled();
            expect(mockTrigger.openMenu).not.toHaveBeenCalled();
        });

        it('contextMenus 指定時は右クリックでメニューを開く', () => {
            fixture.componentRef.setInput('operationNumber', '1001');
            fixture.componentRef.setInput('contextMenus', [
                { icon: 'block', text: '無効化', onClick: () => {} },
            ]);
            fixture.detectChanges();

            const event = {
                preventDefault: jest.fn(),
            } as unknown as MouseEvent;
            component.onContextMenu(
                event,
                mockTrigger as unknown as MatMenuTrigger,
            );

            expect(event.preventDefault).toHaveBeenCalled();
            expect(mockTrigger.openMenu).toHaveBeenCalled();
        });

        it('長押し（既定500ms）でメニューを開く（モバイル: contextmenu 非対応の代替）', () => {
            jest.useFakeTimers();
            fixture.componentRef.setInput('operationNumber', '1001');
            fixture.componentRef.setInput('contextMenus', [
                { icon: 'block', text: '無効化', onClick: () => {} },
            ]);
            fixture.detectChanges();

            component.onTouchStart(
                touchAt(0, 0),
                mockTrigger as unknown as MatMenuTrigger,
            );
            jest.advanceTimersByTime(500);

            expect(mockTrigger.openMenu).toHaveBeenCalled();
            jest.useRealTimers();
        });

        it('長押し発火前に touchend すればメニューを開かない', () => {
            jest.useFakeTimers();
            fixture.componentRef.setInput('operationNumber', '1001');
            fixture.componentRef.setInput('contextMenus', [
                { icon: 'block', text: '無効化', onClick: () => {} },
            ]);
            fixture.detectChanges();

            component.onTouchStart(
                touchAt(0, 0),
                mockTrigger as unknown as MatMenuTrigger,
            );
            component.onTouchEnd({
                preventDefault: jest.fn(),
            } as unknown as TouchEvent);
            jest.advanceTimersByTime(500);

            expect(mockTrigger.openMenu).not.toHaveBeenCalled();
            jest.useRealTimers();
        });

        it('長押しでメニューが開いた後の click はナビゲーションを抑止する', () => {
            jest.useFakeTimers();
            fixture.componentRef.setInput('operationNumber', '1001');
            fixture.componentRef.setInput('link', [
                '/operation',
                'route-diagram',
            ]);
            fixture.componentRef.setInput('contextMenus', [
                { icon: 'block', text: '無効化', onClick: () => {} },
            ]);
            fixture.detectChanges();

            component.onTouchStart(
                touchAt(0, 0),
                mockTrigger as unknown as MatMenuTrigger,
            );
            jest.advanceTimersByTime(500);

            const clickEvent = {
                preventDefault: jest.fn(),
            } as unknown as MouseEvent;
            component.onClick(clickEvent);

            expect(clickEvent.preventDefault).toHaveBeenCalled();
            jest.useRealTimers();
        });
    });
});
