import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { ThemeProvider } from './components/theme-provider';
import { GlobalLayout } from './layouts/GlobalLayout';
import { TaskScreen } from './pages/TaskScreen';
import { CoursesListPage } from './pages/CoursesListPage';
import { CourseDetailsPage } from './pages/CourseDetailsPage';
import { DatabasesListPage } from './pages/DatabasesListPage';
import { ProfilePage } from './pages/ProfilePage';
import { TasksListPage } from './pages/TasksListPage';
import { StudioPage } from './pages/StudioPage';
import { SettingsPage } from './pages/PlaceholderPages';
import { TaskWizardScreen } from './pages/task-wizard/TaskWizardScreen';
import { CourseWizardScreen } from './pages/course-wizard/CourseWizardScreen';

const router = createBrowserRouter([
  {
    path: '/',
    element: <GlobalLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/courses" replace />,
      },
      {
        path: 'courses',
        element: <CoursesListPage />,
      },
      {
        path: 'courses/:id',
        element: <CourseDetailsPage />,
      },
      {
        path: 'databases',
        element: <DatabasesListPage />,
      },
      {
        path: 'tasks',
        element: <TasksListPage />,
      },
      {
        path: 'tasks/:id',
        element: <TaskScreen />,
      },
      {
        path: 'studio',
        element: <StudioPage />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
      {
        path: 'profile',
        element: <ProfilePage />,
      },
    ],
  },
  {
    path: '/studio/task/:id',
    element: <TaskWizardScreen />
  },
  {
    path: '/studio/course/:id',
    element: <CourseWizardScreen />
  }
]);

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="llpg_theme">
      <RouterProvider router={router} />
    </ThemeProvider>
  );
}

export default App;
