import { Analytics } from '@vercel/analytics/react';
import { default as FlavorFinderV2 } from './FlavorFinderV2.tsx';
import { ThemeProvider } from './contexts/ThemeContext.tsx';

function App(): JSX.Element {
  return (
    <ThemeProvider>
      <div className="App">
        <FlavorFinderV2 />
      </div>
      <Analytics />
    </ThemeProvider>
  );
}

export default App;
