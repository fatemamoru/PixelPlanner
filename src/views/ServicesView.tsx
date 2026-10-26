import { useEffect, useState } from 'react';
import { Button } from '../components/Button';
import { useServices } from '../app/AppContext';
import type { MarketingService } from '../domain/types';
import styles from './views.module.css';

export function ServicesView() {
  const { loadServices } = useServices();
  const [services, setServices] = useState<MarketingService[] | null>(null);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<MarketingService | null>(null);

  useEffect(() => {
    let active = true;
    loadServices()
      .then((list) => {
        if (active) setServices(list);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [loadServices]);

  return (
    <section className={styles.view} aria-labelledby="services-heading">
      <h1 id="services-heading">Pixel &amp; Growth services</h1>
      <p>Need more than planning? Explore how Pixel &amp; Growth can help you grow.</p>

      {error ? (
        <p className={styles.error} role="alert">
          Services information could not be loaded right now. Please try again later.
        </p>
      ) : services === null ? (
        <p role="status">Loading…</p>
      ) : services.length === 0 ? (
        <p className={styles.empty}>Services information is currently unavailable.</p>
      ) : (
        <div className={styles.card}>
          <ul className={styles.list}>
            {services.map((svc) => (
              <li key={svc.id} className={styles.card}>
                <div className={styles.row}>
                  <h3 style={{ marginRight: 'auto' }}>{svc.name}</h3>
                  <Button
                    variant="secondary"
                    aria-expanded={selected?.id === svc.id}
                    onClick={() => setSelected(selected?.id === svc.id ? null : svc)}
                  >
                    {selected?.id === svc.id ? 'Hide details' : 'View details'}
                  </Button>
                </div>
                <p>{svc.description}</p>
                {selected?.id === svc.id && (
                  <p className={styles.muted}>
                    <strong>How to engage:</strong> {svc.howToEngage}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
