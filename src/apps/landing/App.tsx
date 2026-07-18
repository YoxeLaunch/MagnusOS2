import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Features from './components/Features';
import Simulation from './components/Simulation';
import Pricing from './components/Pricing';
import Footer from './components/Footer';

// Screens
import DashboardScreen from './components/screens/DashboardScreen';
import FeaturesScreen from './components/screens/FeaturesScreen';
import PricingScreen from './components/screens/PricingScreen';

const LandingApp: React.FC = () => {
  const [currentView, setCurrentView] = useState('home');
  const navigate = useNavigate();

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardScreen />;
      case 'features':
        return <FeaturesScreen />;
      case 'pricing':
        return <PricingScreen />;
      case 'home':
      default:
        return (
          <main>
            <Hero />
            <Features />
            <Simulation />
            <Pricing />
          </main>
        );
    }
  };

  return (
    <div className="antialiased selection:bg-theme-gold selection:text-black min-h-screen flex flex-col">
      <Navbar
        onNavigate={setCurrentView}
        currentView={currentView}
        onLogin={() => navigate('/login')}
        onRegister={() => navigate('/register')}
      />

      {renderView()}

      {currentView !== 'dashboard' && <Footer />}
    </div>
  );
};

export default LandingApp;
