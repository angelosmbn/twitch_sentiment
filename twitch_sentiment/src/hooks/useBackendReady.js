import { useEffect, useState } from 'react';

export function useBackendReady() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let interval = setInterval(async () => {
      try {
        const res = await fetch('http://localhost:8080/healthz');
        if (res.ok) {
          setReady(true);
          clearInterval(interval);
        }
      } catch {
        // Backend not ready yet, keep polling
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return ready;
}
