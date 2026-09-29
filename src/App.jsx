import { useEffect, useSyncExternalStore } from 'react';
import Home from './pages/Home.jsx';
import Create from './pages/Create.jsx';
import Editor from './pages/editor/Editor.jsx';
import { Toaster } from './components/Toast.jsx';

// Hash routes: #/  ·  #/new  ·  #/edit/<id>
const subscribe = (fn) => {
  window.addEventListener('hashchange', fn);
  return () => window.removeEventListener('hashchange', fn);
};
const useHash = () => useSyncExternalStore(subscribe, () => location.hash || '#/');

export default function App() {
  const hash = useHash();
  const edit = hash.match(/^#\/edit\/(\w+)/);
  const route = edit ? 'editor' : hash.startsWith('#/new') ? 'create' : 'home';

  useEffect(() => {
    window.scrollTo(0, 0);
    if (route === 'home') document.title = 'Plonk — drop blocks, build anything';
    if (route === 'create') document.title = 'New project — Plonk';
  }, [route]);

  return (
    <div className={`route-${route}`}>
      {route === 'editor' && <Editor key={edit[1]} id={edit[1]} />}
      {route === 'create' && <Create />}
      {route === 'home' && <Home />}
      <Toaster />
    </div>
  );
}
