import '@testing-library/jest-dom';
import { Component, input, output } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { OperationPostFormComponent } from '../operation-post-card/operation-post-form.component';
import { OperationPostSource } from '../operation-post-card/operation-post-source.type';
import { OperationPostDialogComponent } from './operation-post-dialog.component';

@Component({
    selector: 'app-operation-post-form',
    template:
        '<form><div tabindex="0" formcontrolname="agencyId"></div></form>',
})
class StubFormComponent {
    readonly initialValue = input<unknown>({});
    readonly source = input<OperationPostSource>('top_card');
    readonly submitted = output<void>();
    readonly submittingChange = output<boolean>();
}

@Component({
    selector: 'app-operation-post-form',
    template: '<p>目撃の投稿にはログインが必要です</p>',
})
class StubGuestFormComponent extends StubFormComponent {}

/** ダイアログを開いた直後のフォーカス（最初の欄。欄が無い表示では閉じるボタン） */
describe('OperationPostDialogComponent の最初のフォーカス', () => {
    async function create(
        stub: typeof StubFormComponent,
    ): Promise<ComponentFixture<OperationPostDialogComponent>> {
        await TestBed.configureTestingModule({
            imports: [OperationPostDialogComponent],
            providers: [
                {
                    provide: MatDialogRef,
                    useValue: { close: jest.fn(), disableClose: false },
                },
                {
                    provide: Router,
                    useValue: { events: new Subject(), url: '/' },
                },
                {
                    provide: MAT_DIALOG_DATA,
                    useValue: { source: 'realtime_fab', initialValue: {} },
                },
            ],
        })
            .overrideComponent(OperationPostDialogComponent, {
                remove: { imports: [OperationPostFormComponent] },
                add: { imports: [stub] },
            })
            .compileComponents();
        const fixture = TestBed.createComponent(OperationPostDialogComponent);
        document.body.appendChild(fixture.nativeElement);
        fixture.detectChanges();
        await fixture.whenStable();
        return fixture;
    }

    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('欄があるときは、閉じるボタンではなく最初の欄にフォーカスが入る', async () => {
        const fixture = await create(StubFormComponent);

        expect(
            fixture.nativeElement.querySelector('[formcontrolname="agencyId"]'),
        ).toHaveFocus();
    });

    it('欄が無いゲストの表示では、ダイアログの中の閉じるボタンにフォーカスが入る', async () => {
        const fixture = await create(StubGuestFormComponent);

        expect(
            fixture.nativeElement.querySelector(
                'button[aria-label="投稿ダイアログを閉じる"]',
            ),
        ).toHaveFocus();
    });
});
