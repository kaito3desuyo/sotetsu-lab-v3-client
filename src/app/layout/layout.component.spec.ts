import {
    Component,
    NO_ERRORS_SCHEMA,
    ChangeDetectionStrategy,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { PageNotFound } from '../core/page-not-found/page-not-found';
import { LayoutComponent } from './layout.component';

@Component({ changeDetection: ChangeDetectionStrategy.OnPush, template: '' })
class DummyComponent {}

describe('LayoutComponent', () => {
    let component: LayoutComponent;
    let fixture: ComponentFixture<LayoutComponent>;
    let router: Router;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [LayoutComponent],
            providers: [
                provideRouter([
                    {
                        path: '',
                        component: DummyComponent,
                    },
                    {
                        path: 'train-diagram',
                        component: DummyComponent,
                        data: { title: 'ダイヤグラム' },
                    },
                ]),
            ],
        })
            .overrideComponent(LayoutComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();

        router = TestBed.inject(Router);
        fixture = TestBed.createComponent(LayoutComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('pageTitle: Route data の title を反映する', async () => {
        await router.navigate(['/train-diagram']);
        expect(component.pageTitle()).toBe('ダイヤグラム');
    });

    it('pageTitle: title を持たないルート（ホーム等）では空文字になる', async () => {
        await router.navigate(['/train-diagram']);
        await router.navigate(['/']);
        expect(component.pageTitle()).toBe('');
    });

    it('pageTitle: 見つからない表示のときは PageNotFound.title になり、戻ると元の題名に戻る', async () => {
        await router.navigate(['/train-diagram']);
        const notFound = TestBed.inject(PageNotFound);

        notFound.mark();
        expect(component.pageTitle()).toBe(PageNotFound.title);

        notFound.clear();
        expect(component.pageTitle()).toBe('ダイヤグラム');
    });

    it('pageTitle: 見つからない表示から別のページへ移ると、見出しが残らない', async () => {
        await router.navigate(['/train-diagram']);
        TestBed.inject(PageNotFound).mark();

        await router.navigate(['/']);

        expect(component.pageTitle()).toBe('');
    });
});
