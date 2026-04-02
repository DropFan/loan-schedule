import { useCallback, useEffect, useRef, useState } from 'react';
import { useLoanStore } from '@/stores/useLoanStore';
import { Button } from '../ui/button';

function usePwaUpdate() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [newVersion, setNewVersion] = useState<string | null>(null);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const fetchNewVersion = () => {
      fetch(`/version.json?t=${Date.now()}`)
        .then((r) => r.json())
        .then((data) => setNewVersion(data.version))
        .catch(() => {});
    };

    navigator.serviceWorker
      .register('/service-worker.js', { scope: '/' })
      .then((reg) => {
        registrationRef.current = reg;

        if (reg.waiting) {
          setNeedRefresh(true);
          fetchNewVersion();
          return;
        }

        reg.addEventListener('updatefound', () => {
          const newSw = reg.installing;
          if (!newSw) return;
          newSw.addEventListener('statechange', () => {
            if (
              newSw.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              setNeedRefresh(true);
              fetchNewVersion();
            }
          });
        });
      });

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  }, []);

  const update = useCallback(() => {
    registrationRef.current?.waiting?.postMessage({ type: 'SKIP_WAITING' });
  }, []);

  return { needRefresh, newVersion, update };
}

export function PwaUpdatePrompt() {
  const autoUpdate = useLoanStore((s) => s.autoUpdate);
  const { needRefresh, newVersion, update } = usePwaUpdate();
  const [countdown, setCountdown] = useState(-1);

  useEffect(() => {
    if (needRefresh && autoUpdate) {
      setCountdown(3);
    }
  }, [needRefresh, autoUpdate]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  useEffect(() => {
    if (countdown === 0) {
      update();
    }
  }, [countdown, update]);

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 lg:bottom-6">
      <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-lg">
        <span className="text-sm">
          发现新版本
          {newVersion && (
            <>
              {' '}
              <span className="font-medium text-primary">v{newVersion}</span>
            </>
          )}
          {autoUpdate && (
            <span className="ml-1 text-muted-foreground">
              {countdown}s 后自动更新
            </span>
          )}
        </span>
        <Button size="sm" onClick={update}>
          立即更新
        </Button>
      </div>
    </div>
  );
}
