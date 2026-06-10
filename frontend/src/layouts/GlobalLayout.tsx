import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/navigation/Navbar';
import { CourseTOC } from '../components/navigation/CourseTOC';

export const GlobalLayout: React.FC = () => {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground transition-colors duration-300 relative z-0">
      {/* Sliding Course TOC (Left Panel) */}
      <CourseTOC />

      {/* Main Content (Task Screen or other pages) */}
      <div className="flex-1 flex flex-col relative z-10 w-full h-full">
        <Navbar />
        <main className="flex-1 overflow-hidden relative">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
