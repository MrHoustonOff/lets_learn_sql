import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { ThemeProvider } from './components/theme-provider';
import { GlobalLayout } from './layouts/GlobalLayout';
import { TaskScreen } from './pages/TaskScreen';
import { CoursesListPage } from './pages/CoursesListPage';
import { CourseDetailsPage } from './pages/CourseDetailsPage';
import { DatabasesListPage } from './pages/DatabasesListPage';
import { TasksPage, SettingsPage, ProfilePage } from './pages/PlaceholderPages';

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
        element: <TasksPage />,
      },
      {
        path: 'tasks/:id',
        element: <TaskScreen />,
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
]);

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="llpg_theme">
      <RouterProvider router={router} />
    </ThemeProvider>
  );
}

export default App;
