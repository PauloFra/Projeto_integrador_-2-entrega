import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { ProvedorSessao } from './contexto/SessaoContexto';
import { ProvedorNotificacao } from './contexto/NotificacaoContexto';
import './estilos/tokens.css';
import './estilos/base.css';
import './estilos/componentes.css';

const raiz = document.getElementById('raiz');
if (!raiz) throw new Error('Elemento #raiz não encontrado em index.html.');

createRoot(raiz).render(
  <StrictMode>
    <BrowserRouter>
      <ProvedorSessao>
        <ProvedorNotificacao>
          <App />
        </ProvedorNotificacao>
      </ProvedorSessao>
    </BrowserRouter>
  </StrictMode>,
);
