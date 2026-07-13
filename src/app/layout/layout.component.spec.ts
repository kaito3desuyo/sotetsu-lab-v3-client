import { Component, NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { LayoutComponent } from './layout.component';

@Component({ template: '' })
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
});
