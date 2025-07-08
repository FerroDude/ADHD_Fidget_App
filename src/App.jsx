import { useState, useEffect } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import ThemeToggle from './components/ThemeToggle/ThemeToggle.jsx';
import BubbleWrapFidget from './components/BubbleWrapFidget/BubbleWrapFidget.jsx';
import StressBallFidget from './components/StressBallFidget/StressBallFidget.jsx';
import PlaceholderFidgetOne from './components/placeholdersFidgets/PlaceholderFidgetOne';
import PlaceholderFidgetThree from './components/placeholdersFidgets/PlaceholderFidgetThree';
import PlaceholderFidgetFour from './components/placeholdersFidgets/PlaceholderFidgetFour';
import PlaceholderFidgetFive from './components/placeholdersFidgets/PlaceholderFidgetFive';

function App() {
  const [activeFidget, setActiveFidget] = useState(1);
  const [isMobile, setIsMobile] = useState(false);

  // Check for mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    // Initial check
    checkMobile();

    // Add event listener for window resize
    window.addEventListener('resize', checkMobile);

    // Clean up
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Render active fidget based on state
  const renderActiveFidget = () => {
    switch (activeFidget) {
      case 1:
        return <BubbleWrapFidget />;
      case 2:
        return <StressBallFidget />;
      case 3:
        return <PlaceholderFidgetThree />;
      case 4:
        return <PlaceholderFidgetFour />;
      case 5:
        return <PlaceholderFidgetFive />;
      default:
        return <PlaceholderFidgetOne />;
    }
  };

  return (
    <ThemeProvider>
      <div className="app-container">
        <header className="app-header">
          <div className="app-header-content">
            <h1>ADHD Fidgets</h1>
            <h2>
              Science-based fidget tools to help improve focus and
              concentration.
            </h2>
          </div>
          <ThemeToggle />
        </header>

        <main>
          {/* Fidget selector */}
          <div className="fidget-selection">
            {[1, 2, 3, 4, 5].map((num) => (
              <div
                key={num}
                className={`fidget-icon ${
                  activeFidget === num ? 'active' : ''
                }`}
                onClick={() => setActiveFidget(num)}
                role="button"
                aria-label={`Select fidget ${num}`}
                tabIndex={0}
              >
                {num}
              </div>
            ))}
          </div>

          {/* Focused fidget display area */}
          <div className={`focused-fidget ${isMobile ? 'mobile-view' : ''}`}>
            {renderActiveFidget()}
          </div>
        </main>
      </div>
    </ThemeProvider>
  );
}

export default App;
