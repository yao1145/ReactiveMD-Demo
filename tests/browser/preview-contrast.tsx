import { createRoot } from 'react-dom/client';
import { LocalReactiveDocument } from 'reactive-md/react';
import 'reactive-md/styles.css';
import '../../src/app/styles.css';

const scheme = new URLSearchParams(location.search).get('scheme') === 'dark' ? 'dark' : 'light';
createRoot(document.getElementById('root')!).render(<>
  <LocalReactiveDocument source={'<quiz label="题目" answer="b"><option value="a">甲</option><option value="b">乙</option></quiz>'} colorScheme={scheme} locale="zh" />
  <article className="md-document" data-color-scheme={scheme}>
    <button className="md-button-primary"><span>原生主按钮</span></button>
    <input type="submit" className="md-button-primary" value="提交" />
    <button className="md-button-primary" disabled>禁用</button>
  </article>
</>);
