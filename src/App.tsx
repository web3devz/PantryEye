/**
 * Main App Component
 * Requirements: 1.5, 10.1
 * Shows authentication screen or main app based on auth state
 */

import { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import { AuthScreen } from './components/AuthScreen';
import { InventoryManagement } from './components/InventoryManagement';
import { CameraPage } from './components/CameraPage';
import { ReceiptPage } from './components/ReceiptPage';
import { CartManagement } from './components/CartManagement';
import { OrderManagement } from './components/OrderManagement';
import { ChatbotPanel } from './components/ChatbotPanel';

type View = 'inventory' | 'camera' | 'receipt' | 'cart' | 'orders';

function App() {
  const { isAuthenticated, isLoading, logout } = useAuth();
  const [currentView, setCurrentView] = useState<View>('inventory');
  const [showChatbot, setShowChatbot] = useState(false);

  if (isLoading) {
    return (
      <div className="app">
        <div className="loading-screen">
          <h1>PantryEye</h1>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1>PantryEye</h1>
          <nav className="app-nav">
            <button
              onClick={() => setCurrentView('inventory')}
              className={`nav-button ${currentView === 'inventory' ? 'active' : ''}`}
            >
              Inventory
            </button>
            <button
              onClick={() => setCurrentView('camera')}
              className={`nav-button ${currentView === 'camera' ? 'active' : ''}`}
            >
              Camera
            </button>
            <button
              onClick={() => setCurrentView('receipt')}
              className={`nav-button ${currentView === 'receipt' ? 'active' : ''}`}
            >
              Receipt
            </button>
            <button
              onClick={() => setCurrentView('cart')}
              className={`nav-button ${currentView === 'cart' ? 'active' : ''}`}
            >
              Cart
            </button>
            <button
              onClick={() => setCurrentView('orders')}
              className={`nav-button ${currentView === 'orders' ? 'active' : ''}`}
            >
              Orders
            </button>
          </nav>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button 
            onClick={() => setShowChatbot(!showChatbot)} 
            className="chatbot-toggle-button"
            title="AI Assistant"
          >
            🤖 AI Help
          </button>
          <button onClick={logout} className="logout-button">
            Logout
          </button>
        </div>
      </header>
      <main className="app-main">
        {currentView === 'inventory' && <InventoryManagement />}
        {currentView === 'camera' && (
          <CameraPage
            onComplete={() => setCurrentView('inventory')}
            onCancel={() => setCurrentView('inventory')}
          />
        )}
        {currentView === 'receipt' && (
          <ReceiptPage
            onComplete={() => setCurrentView('inventory')}
            onCancel={() => setCurrentView('inventory')}
          />
        )}
        {currentView === 'cart' && <CartManagement />}
        {currentView === 'orders' && <OrderManagement />}
      </main>

      {/* Chatbot Panel */}
      {showChatbot && (
        <ChatbotPanel onClose={() => setShowChatbot(false)} />
      )}
    </div>
  );
}

export default App;
