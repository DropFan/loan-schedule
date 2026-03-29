import { Providers } from './providers';
import { AppRoutes } from './routes';
import '@khmyznikov/pwa-install';

export function App() {
  return (
    <Providers>
      <AppRoutes />
      <pwa-install
        manifest-url="/manifest.json"
        disable-chrome="true"
        manual-apple="true"
      />
    </Providers>
  );
}
