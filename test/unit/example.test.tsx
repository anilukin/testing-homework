import React, { PropsWithChildren } from 'react';
import { Catalog } from '../../src/client/pages/Catalog';
import { Cart } from '../../src/client/pages/Cart';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { AxiosResponse } from 'axios';
import { CartApi, ExampleApi, LOCAL_STORAGE_CART_KEY } from '../../src/client/api';
import { initStore } from '../../src/client/store';
import { ProductShortInfo, Product as ProductT, CheckoutFormData, CartState, CheckoutResponse } from '../../src/common/types';
import { BrowserRouter, MemoryRouter, Route } from 'react-router-dom';
import { Product } from '../../src/client/pages/Product';

beforeEach(() => {
    globalThis.localStorage.clear();
})

describe('Simple Test Case', () => {
  it('Should return 4', () => {
    const app = <div>example</div>;

    const { container } = render(app);

    console.log(container.outerHTML);

    expect(container.textContent).toBe('example');
  });
});

function wrapAxiosResponse<T = unknown>(data: T): Promise<AxiosResponse<T>> {
  return new Promise((resolve) => {
    resolve({
      data: data,
      status: 200,
      statusText: 'ok',
      headers: {},
      config: {},
    });
  });
}

describe('Catalog', () => {
  it('В каталоге товары, которые пришли с сервера', async () => {
    const testData = [
      {
        id: 1,
        name: 'Product 1',
        price: 42,
      },
      {
        id: 2,
        name: 'Product 2',
        price: 42,
      },
    ];

    class MockedExampleApi extends ExampleApi {
      constructor(basename: string) {
        super(basename);
      }
      getProducts(): Promise<AxiosResponse<ProductShortInfo[], any>> {
        return wrapAxiosResponse<ProductShortInfo[]>(testData);
      }
    }

    const api = new MockedExampleApi('');
    const cart = new CartApi();
    const store = initStore(api, cart);

    function Wrapper({ children }: PropsWithChildren<{}>): JSX.Element {
      return <Provider store={store}>{children}</Provider>;
    }

    const result = render(
      <BrowserRouter>
        <Catalog />
      </BrowserRouter>,
      { wrapper: Wrapper }
    );

    await waitFor(() => {});

    testData.forEach((item) => {
      const testIdDivs = result.getAllByTestId(item.id);

      const productContainer = testIdDivs[0];
      const titleEl = productContainer.querySelector('.ProductItem-Name');
      const priceEl = productContainer.querySelector('.ProductItem-Price');
      const aEl = productContainer.querySelector('.ProductItem-DetailsLink');

      expect(testIdDivs.length).toBe(2);
      expect(titleEl && priceEl && aEl).not.toBeNull();
      expect(titleEl.textContent).toBe(item.name);
      expect(priceEl.textContent).toBe(`$${item.price}`);
      expect(aEl.getAttribute('href')).toBe(`/catalog/${item.id}`);
    });
  });
});

describe('Product', () => {
  it('Проверка наполнения страницы с подробной информацией о товаре', async () => {
    const testProduct = {
      id: 1,
      name: 'Product 1',
      price: 42,
      description: 'very helpful in household',
      material: 'glass',
      color: 'transparent',
    };

    class MockedExampleApi extends ExampleApi {
      constructor(basename: string) {
        super(basename);
      }
      getProductById(id: number): Promise<AxiosResponse<ProductT, object>> {
        return wrapAxiosResponse<ProductT>(testProduct);
      }
    }

    const api = new MockedExampleApi('');
    const cart = new CartApi();
    const store = initStore(api, cart);

    function Wrapper({ children }: PropsWithChildren<{}>): JSX.Element {
      return <Provider store={store}>{children}</Provider>;
    }

    const result = render(
      <MemoryRouter initialEntries={[`/catalog/${testProduct.id}`]}>
        <Route path={'/catalog/:id'}>
          <Product />
        </Route>
      </MemoryRouter>,
      { wrapper: Wrapper }
    );

    await waitFor(() => {});

    const testDivConteiner = result.container;

    const titleEl = testDivConteiner.querySelector('.ProductDetails-Name');
    const descriptionEl = testDivConteiner.querySelector(
      '.ProductDetails-Description'
    );
    const priceEl = testDivConteiner.querySelector('.ProductDetails-Price');
    const colorEl = testDivConteiner.querySelector('.ProductDetails-Color');
    const materialEl = testDivConteiner.querySelector(
      '.ProductDetails-Material'
    );
    const buttonEl = testDivConteiner.querySelector(
      '.ProductDetails-AddToCart'
    );

    expect(titleEl.textContent).toBe(testProduct.name);
    expect(descriptionEl.textContent).toBe(testProduct.description);
    expect(priceEl.textContent).toBe(`$${testProduct.price}`);
    expect(colorEl.textContent).toBe(testProduct.color);
    expect(materialEl.textContent).toBe(testProduct.material);
    expect(buttonEl.textContent).toBe('Add to Cart');
  });

  it('Наличие уведомления о добавлении товара в корзину', async () => {
    const testProduct = {
      id: 1,
      name: 'Product 1',
      price: 42,
      description: 'very helpful in household',
      material: 'glass',
      color: 'transparent',
    };

    class MockedExampleApi extends ExampleApi {
      constructor(basename: string) {
        super(basename);
      }
      getProductById(id: number): Promise<AxiosResponse<ProductT, object>> {
        return wrapAxiosResponse<ProductT>(testProduct);
      }
    }

    const api = new MockedExampleApi('');
    const cart = new CartApi();
    const store = initStore(api, cart);

    function Wrapper({ children }: PropsWithChildren<{}>): JSX.Element {
      return <Provider store={store}>{children}</Provider>;
    }

    const result = render(
      <MemoryRouter initialEntries={[`/catalog/${testProduct.id}`]}>
        <Route path={'/catalog/:id'}>
          <Product />
        </Route>
      </MemoryRouter>,
      { wrapper: Wrapper }
    );

    await waitFor(() => {});

    expect(Object.keys(store.getState().cart).length).toBe(0);

    const testDivConteiner = result.container;
    const buttonEl = testDivConteiner.querySelector(
      '.ProductDetails-AddToCart'
    );

    expect(buttonEl).not.toBeNull();

    fireEvent(
      buttonEl,
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      })
    );
    const text = testDivConteiner.querySelector('.text-success');
    expect(text).not.toBeNull();

    const newState = store.getState();
    expect(Object.keys(newState.cart).length).toBe(1);

    const cartItem = newState.cart[testProduct.id];
    expect(cartItem).not.toBeNull();
    expect(cartItem.name).toBe(testProduct.name);
    expect(cartItem.count).toBe(1);
    expect(cartItem.price).toBe(testProduct.price);
  });
});

describe('Cart', () => {
    it('Проверка содержимого корзины', async () => {

        const testProduct1Id = 100;
        const testProduct1 = {
            name: 'Product 124',
            price: 4242,
            count: 2,
          };

          const testProduct2Id = 200;
          const testProduct2 = {
            name: 'Product 24242',
            price: 1442424,
            count: 1,
          };
      

          const api = new ExampleApi('');
          const cart = new CartApi();
          const store = initStore(api, cart);
          store.getState
          const initionalCart = {
            100: testProduct1,
            200: testProduct2,
          }

      
          function Wrapper({ children }: PropsWithChildren<{}>): JSX.Element {
            return <Provider store={store}>{children}</Provider>;
          }
      
          const result = render(
            <BrowserRouter>
              <Cart />
            </BrowserRouter>,
            { wrapper: Wrapper }
          );
      
          

          screen.logTestingPlaygroundURL();
    })
})