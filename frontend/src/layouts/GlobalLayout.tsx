import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from '../components/navigation/Navbar';
import { CourseTOC } from '../components/navigation/CourseTOC';

export const GlobalLayout: React.FC = () => {
  const location = useLocation();
  const isTaskPage = location.pathname.startsWith('/tasks');

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground transition-colors duration-300 relative z-base">
      {/* Sliding Course TOC (Left Panel) - only visible on task pages */}
      {isTaskPage && <CourseTOC />}

      {/* Main Content (Task Screen or other pages) */}
      <div className="flex-1 flex flex-col relative z-layout w-full h-full">
        <Navbar />
        <main className="flex-1 relative">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
