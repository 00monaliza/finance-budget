import { BrowserRouter } from 'react-router-dom';
import { QueryProvider } from './providers/QueryProvider';
import { AppRouter } from './router';

export function App() {
  return (
    <BrowserRouter>
      <QueryProvider>
        <AppRouter />
      </QueryProvider>
    </BrowserRouter>
  );
}
