import FlavorFinder from './FlavorFinder';
import { ThemeProvider } from './context/ThemeContext';

function App() {
  return (
    <ThemeProvider>
      <div className="App bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <FlavorFinder />
      </div>
    </ThemeProvider>
  );
}

export default App;