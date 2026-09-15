import { Provider } from 'react-redux';
import { RouterProvider } from '@tanstack/react-router';
import { store } from './store';
import { router } from './router';

export function App() {
  return (
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
  );
}
