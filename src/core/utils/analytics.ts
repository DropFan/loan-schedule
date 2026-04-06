type EventParams = Record<string, string | number | boolean>;

interface DataLayerEvent {
  event: string;
  [key: string]: unknown;
}

declare global {
  interface Window {
    dataLayer?: DataLayerEvent[];
  }
}

function push(data: DataLayerEvent) {
  window.dataLayer?.push(data);
}

export function trackEvent(eventName: string, params?: EventParams) {
  push({ event: eventName, ...params });
}

export function trackPageView(path: string, title?: string) {
  push({
    event: 'page_view',
    page_path: path,
    page_title: title,
  });
}
