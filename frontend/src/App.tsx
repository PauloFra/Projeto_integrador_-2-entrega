import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './componentes/Layout';
import { Carregando } from './componentes/Basicos';
import { useSessao } from './contexto/SessaoContexto';
import { Entrar } from './paginas/Entrar';
import { Inicio } from './paginas/Inicio';
import { MeusPasseios } from './paginas/MeusPasseios';
import { MeusPets } from './paginas/MeusPets';
import { PerfilPet } from './paginas/PerfilPet';
import { Mensagens } from './paginas/Mensagens';
import { AgendaPrestador } from './paginas/AgendaPrestador';
import { PainelClinica } from './paginas/PainelClinica';
import { NaoEncontrada } from './paginas/NaoEncontrada';
import type { Papel } from './tipos';
import type { ReactElement } from 'react';

/** Bloqueia rotas sem sessão e, quando informado, limita por papel. */
const Protegida = ({ children, papeis }: { children: ReactElement; papeis?: Papel[] }) => {
  const { usuario, carregando } = useSessao();

  if (carregando) return <Carregando texto="Abrindo seu cantinho…" />;
  if (!usuario) return <Navigate to="/entrar" replace />;
  if (papeis && !papeis.includes(usuario.papel)) {
    return <NaoEncontrada motivo="Esta área pertence a outro perfil de acesso." />;
  }
  return children;
};

/** A tela inicial depende do papel de quem entrou. */
const InicioPorPapel = () => {
  const { usuario } = useSessao();
  if (usuario?.papel === 'prestador') return <Navigate to="/prestador/agenda" replace />;
  if (usuario?.papel === 'clinica') return <Navigate to="/clinica" replace />;
  return <Inicio />;
};

export const App = () => (
  <Routes>
    <Route path="/entrar" element={<Entrar />} />

    <Route
      element={
        <Protegida>
          <Layout />
        </Protegida>
      }
    >
      <Route index element={<InicioPorPapel />} />
      <Route
        path="passeios"
        element={
          <Protegida papeis={['tutor']}>
            <MeusPasseios />
          </Protegida>
        }
      />
      <Route
        path="pets"
        element={
          <Protegida papeis={['tutor']}>
            <MeusPets />
          </Protegida>
        }
      />
      <Route
        path="pets/:id"
        element={
          <Protegida papeis={['tutor']}>
            <PerfilPet />
          </Protegida>
        }
      />
      <Route path="mensagens" element={<Mensagens />} />
      <Route
        path="prestador/agenda"
        element={
          <Protegida papeis={['prestador']}>
            <AgendaPrestador />
          </Protegida>
        }
      />
      <Route
        path="clinica"
        element={
          <Protegida papeis={['clinica']}>
            <PainelClinica />
          </Protegida>
        }
      />
      <Route path="*" element={<NaoEncontrada />} />
    </Route>
  </Routes>
);

export default App;
