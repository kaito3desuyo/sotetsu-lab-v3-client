import { ComponentFixture, TestBed } from '@angular/core/testing';
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

        expect(getTagEl().style.backgroundColor).toBe(
            'rgba(244, 67, 54, 0.12)',
        );
    });

    it('G を含む運用番号は紺系の群色背景になる', () => {
        fixture.componentRef.setInput('operationNumber', '1G01');
        fixture.detectChanges();

        expect(getTagEl().style.backgroundColor).toBe(
            'rgba(26, 35, 126, 0.12)',
        );
    });

    it('K を含む運用番号は赤茶系の群色背景になる', () => {
        fixture.componentRef.setInput('operationNumber', '1K01');
        fixture.detectChanges();

        expect(getTagEl().style.backgroundColor).toBe(
            'rgba(183, 28, 28, 0.12)',
        );
    });

    it('運用番号 100（休車）は灰色背景になる', () => {
        fixture.componentRef.setInput('operationNumber', '100');
        fixture.detectChanges();

        expect(getTagEl().style.backgroundColor).toBe('rgba(0, 0, 0, 0.12)');
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
        expect(anchor.getAttribute('href')).toBe(
            '/operation/route-diagram;operation_id=123',
        );
    });
});
