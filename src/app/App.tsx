import { useEffect, useRef, useState } from 'react';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { AppContext, type AppServices } from './AppContext';
import { NotificationProvider, useNotifications } from './NotificationContext';
import { bootstrap } from './bootstrap';
import { AppShell } from '../components/AppShell';
import { ViewErrorBoundary } from '../components/ViewErrorBoundary';
import { CreateView } from '../views/CreateView';
import { SavedView } from '../views/SavedView';
import { CalendarView } from '../views/CalendarView';
import { TrackingView } from '../views/TrackingView';
import { ServicesView } from '../views/ServicesView';
import { requestNotificationPermission, type ReminderNotification } from '../infra/notification';

function ViewFallback() {
  return (
    <p role="alert" style={{ padding: 'var(--space-2)' }}>
      This view could not be loaded. Please pick another tab and try again.
    </p>
  );
}

function wrap(node: React.ReactNode) {
  return <ViewErrorBoundary fallback={<ViewFallback />}>{node}</ViewErrorBoundary>;
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/create" replace /> },
      { path: 'create', element: wrap(<CreateView />) },
      { path: 'saved', element: wrap(<SavedView />) },
      { path: 'calendar', element: wrap(<CalendarView />) },
      { path: 'tracking', element: wrap(<TrackingView />) },
      { path: 'services', element: wrap(<ServicesView />) },
      { path: '*', element: <Navigate to="/create" replace /> },
    ],
  },
]);

/** Bridges in-app reminder banners into the notification system. */
function BootstrappedApp() {
  const { notifySuccess } = useNotifications();
  const [services, setServices] = useState<AppServices | null>(null);
  const [failed, setFailed] = useState(false);
  const notifyRef = useRef(notifySuccess);
  notifyRef.current = notifySuccess;

  useEffect(() => {
    let active = true;
    const onReminder = (n: ReminderNotification) => notifyRef.current(`${n.title}: ${n.body}`);
    bootstrap(onReminder)
      .then((s) => {
        if (active) setServices(s);
        void requestNotificationPermission();
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);

  if (failed) {
    return (
      <p role="alert" style={{ padding: 24 }}>
        Pixel Planner could not start. Please refresh the page to try again.
      </p>
    );
  }

  if (!services) {
    return (
      <p role="status" style={{ padding: 24 }}>
        Loading Pixel Planner…
      </p>
    );
  }

  return (
    <AppContext.Provider value={services}>
      <RouterProvider router={router} />
    </AppContext.Provider>
  );
}

export function App() {
  return (
    <NotificationProvider>
      <BootstrappedApp />
    </NotificationProvider>
  );
}
