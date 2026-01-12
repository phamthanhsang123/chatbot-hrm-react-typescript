"use client";

import { useState } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { EmployeeTable } from './components/EmployeeTable';
import { Salary } from './components/Salary';
import { Leave } from './components/Leave';
import { Chatbot } from './components/Chatbot';
import { Reports } from './components/Reports';
import { Analytics } from './components/Analytics';

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'employees':
        return <EmployeeTable />;
      case 'salary':
        return <Salary />;
      case 'leave':
        return <Leave />;
      case 'chatbot':
        return <Chatbot />;
      case 'reports':
        return <Reports />;
      case 'analytics':
        return <Analytics />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50">
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)}
        currentPage={currentPage}
        onNavigate={setCurrentPage}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-4 py-8">
            {renderPage()}
          </div>
        </main>
      </div>
      
    </div>
  );
}