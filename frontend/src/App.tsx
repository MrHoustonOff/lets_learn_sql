import { DBVisualizer } from './modules/db-visualizer';
import { ThemeProvider } from './components/theme-provider';

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="pgym-ui-theme">
      <DBVisualizer />
    </ThemeProvider>
  );
}

export default App;
