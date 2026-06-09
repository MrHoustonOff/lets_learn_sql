import { DBVisualizer } from './modules/db-visualizer';
import { ThemeProvider } from './components/theme-provider';

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="pgym-ui-theme">
      <div className="h-screen w-full">
        <DBVisualizer />
      </div>
    </ThemeProvider>
  );
}

export default App;
