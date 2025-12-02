import { useState, useEffect } from 'react';
import { default as FlavorFinder } from './FlavorFinder';
import { default as FlavorFinderV2 } from './FlavorFinderV2.jsx';

function App() {
  // V2 is now the default
  const [useV2, setUseV2] = useState(true);
  
  // Check URL for version parameter - use ?v1=true to load legacy version
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('v1') === 'true' || params.get('version') === '1') {
      setUseV2(false);
    }
    // Still support ?v2=true for backwards compatibility (though it's now default)
    if (params.get('v2') === 'true' || params.get('version') === '2') {
      setUseV2(true);
    }
  }, []);
  
  // Toggle shortcut: Ctrl+Shift+V to switch versions
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'V') {
        setUseV2(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="App">
      {useV2 ? <FlavorFinderV2 /> : <FlavorFinder />}
    </div>
  );
}

export default App;
