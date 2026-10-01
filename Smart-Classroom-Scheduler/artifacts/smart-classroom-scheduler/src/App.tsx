import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ErrorBoundary } from '@/components/error-boundary';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import Shell from '@/components/Shell';
import Dashboard from '@/pages/Dashboard';
import AssignmentPage from '@/pages/AssignmentPage';
import ResourcePage from '@/pages/ResourcePage';
import NotFound from '@/pages/not-found';
import type { ResourceKey } from '@/lib/types';

const queryClient = new QueryClient();

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function Router() {
  const resource = (resourceKey: ResourceKey) => <ResourcePage resourceKey={resourceKey} />;
  return <Shell><RoutedErrorBoundary><Switch>
    <Route path="/" component={Dashboard} />
    <Route path="/subjects">{() => resource('subjects')}</Route>
    <Route path="/faculty">{() => resource('faculty')}</Route>
    <Route path="/classrooms">{() => resource('classrooms')}</Route>
    <Route path="/student-groups">{() => resource('student-groups')}</Route>
    <Route path="/time-slots">{() => resource('time-slots')}</Route>
    <Route path="/assignments/faculty">{() => <AssignmentPage kind="faculty" />}</Route>
    <Route path="/assignments/student-groups">{() => <AssignmentPage kind="student-groups" />}</Route>
    <Route component={NotFound} />
  </Switch></RoutedErrorBoundary></Shell>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter></TooltipProvider></QueryClientProvider>;
}

export default App;