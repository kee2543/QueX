import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowRight, Clock, Building, Zap, Bell } from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated, isOrg } = useAuth();

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate(isOrg ? '/dashboard' : '/queues');
    } else {
      navigate('/register');
    }
  };

  return (
    <div className="landing-container">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-badge">✨ The Future of Waiting</div>
          <h1 className="hero-title">
            Never wait in a <span className="text-gradient">physical line</span> again.
          </h1>
          <p className="hero-subtitle">
            QueueX is a premium virtual queue management system. Join lines from anywhere, track your live position, and get notified when it's your turn.
          </p>
          <div className="hero-buttons">
            <button className="btn btn-primary btn-lg hero-btn" onClick={handleGetStarted}>
              Get Started <ArrowRight size={20} />
            </button>
            <button className="btn btn-secondary btn-lg hero-btn" onClick={() => navigate('/login')}>
              Sign In
            </button>
          </div>
        </div>
        
        <div className="hero-visual">
          <div className="floating-card card-1">
            <div className="card-header">
              <span className="dot bg-success"></span> Active Queue
            </div>
            <div className="card-body">
              <div className="pos-label">Your Position</div>
              <div className="pos-number">3</div>
              <div className="est-wait">Est. Wait: 15 mins</div>
            </div>
          </div>
          <div className="floating-card card-2">
            <div className="card-header">
              <Bell size={16} color="var(--text-accent)" /> Notification
            </div>
            <div className="card-body-sm">
              Almost there! You're 3rd in line.
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <h2 className="section-title">Why choose <span className="text-gradient">QueueX</span>?</h2>
        
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <Clock className="feature-icon" size={28} />
            </div>
            <h3>Save Time</h3>
            <p>Wait from the comfort of your home, car, or a nearby coffee shop instead of standing in crowded waiting rooms.</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <Zap className="feature-icon" size={28} />
            </div>
            <h3>Real-Time Updates</h3>
            <p>Watch your position move up live. Our WebSocket integration ensures you're never out of sync.</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <Building className="feature-icon" size={28} />
            </div>
            <h3>For Businesses</h3>
            <p>Manage customer flow effortlessly. Call the next user with a single click and improve customer satisfaction.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
