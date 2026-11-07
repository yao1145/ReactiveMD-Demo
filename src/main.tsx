import { createRoot } from 'react-dom/client';
import App from './app/App';
import 'reactive-md/styles.css';
import 'reactive-md-editor/styles.css';
import './app/styles.css';
import './app/author.css';
import './content/guide-code.css';
createRoot(document.getElementById('root')!).render(<App />);
