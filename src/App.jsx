import { useState } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import ThemeToggle from './components/ThemeToggle/ThemeToggle.jsx';
import PlaceholderFidgetOne from './components/placeholdersFidgets/PlaceholderFidgetOne';
import PlaceholderFidgetTwo from './components/placeholdersFidgets/PlaceholderFidgetTwo';
import PlaceholderFidgetThree from './components/placeholdersFidgets/PlaceholderFidgetThree';
import PlaceholderFidgetFour from './components/placeholdersFidgets/PlaceholderFidgetFour';
import PlaceholderFidgetFive from './components/placeholdersFidgets/PlaceholderFidgetFive';

function App() {
  const [activeFidget, setActiveFidget] = useState(1);

  // Render active fidget based on state
  const renderActiveFidget = () => {
    switch (activeFidget) {
      case 1:
        return <PlaceholderFidgetOne />;
      case 2:
        return <PlaceholderFidgetTwo />;
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
          {/* Placeholder for the fidget selector */}
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
          <div className="focused-fidget">{renderActiveFidget()}</div>
        </main>
      </div>
    </ThemeProvider>
  );
}

export default App;
