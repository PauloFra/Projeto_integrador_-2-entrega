import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  Dog,
  Hospital,
  House,
  LogOut,
  MapPin,
  MessageCircle,
  Footprints,
} from 'lucide-react';
import { Marca } from './Marca';
import { Avatar } from './Basicos';
import { useSessao } from '../contexto/SessaoContexto';
import type { Papel } from '../tipos';

interface ItemMenu {
  para: string;
  rotulo: string;
  rotuloCurto: string;
  icone: typeof House;
}

/** Cada papel navega apenas pelas áreas às quais tem acesso. */
const MENU_POR_PAPEL: Record<Papel, ItemMenu[]> = {
  tutor: [
    { para: '/', rotulo: 'Início', rotuloCurto: 'Início', icone: House },
    { para: '/passeios', rotulo: 'Meus passeios', rotuloCurto: 'Passeios', icone: Footprints },
    { para: '/pets', rotulo: 'Meus pets', rotuloCurto: 'Pets', icone: Dog },
    { para: '/mensagens', rotulo: 'Mensagens', rotuloCurto: 'Mensagens', icone: MessageCircle },
  ],
  prestador: [
    {
      para: '/prestador/agenda',
      rotulo: 'Agenda do prestador',
      rotuloCurto: 'Agenda',
      icone: CalendarDays,
    },
    { para: '/mensagens', rotulo: 'Mensagens', rotuloCurto: 'Mensagens', icone: MessageCircle },
  ],
  clinica: [
    { para: '/clinica', rotulo: 'Painel da clínica', rotuloCurto: 'Clínica', icone: Hospital },
    { para: '/mensagens', rotulo: 'Mensagens', rotuloCurto: 'Mensagens', icone: MessageCircle },
  ],
};

/**
 * Casca do aplicativo: cabeçalho fixo, navegação de topo (telas largas),
 * barra inferior (telas pequenas) e rodapé.
 */
export const Layout = () => {
  const { usuario, sair } = useSessao();
  const navegar = useNavigate();

  const itens = usuario ? MENU_POR_PAPEL[usuario.papel] : [];

  const encerrar = () => {
    sair();
    navegar('/entrar');
  };

  return (
    <div className="app">
      <header className="cabecalho">
        <div className="conteudo cabecalho__interno">
          <Marca para={itens[0]?.para ?? '/'} />

          <nav className="navegacao" aria-label="Navegação principal">
            {itens.map(({ para, rotulo, icone: Icone }) => (
              <NavLink key={para} to={para} end={para === '/'} className="navegacao__item">
                <Icone size={16} aria-hidden />
                {rotulo}
              </NavLink>
            ))}
          </nav>

          <div className="cabecalho__direita">
            {usuario?.bairro && (
              <span className="local">
                <MapPin size={14} aria-hidden />
                {usuario.bairro}, {usuario.cidade}
              </span>
            )}
            {usuario && (
              <>
                <Avatar nome={usuario.nome} foto={usuario.avatarUrl} />
                <button
                  type="button"
                  className="botao botao--texto"
                  onClick={encerrar}
                  title={`Sair da conta de ${usuario.nome}`}
                >
                  <LogOut size={16} aria-hidden />
                  <span className="somente-leitores-de-tela">Sair</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="principal">
        <div className="conteudo">
          <Outlet />
        </div>
      </main>

      <footer className="rodape">
        <div className="conteudo linha-espalhada">
          <span>
            Patas Conectadas · Prova de Conceito do Projeto Integrador · uma comunidade feita de
            cuidado.
          </span>
          <span className="texto-pequeno">
            Dados de demonstração — nenhuma cobrança real é processada.
          </span>
        </div>
      </footer>

      <nav className="barra-inferior" aria-label="Navegação rápida">
        {itens.map(({ para, rotuloCurto, icone: Icone }) => (
          <NavLink key={para} to={para} end={para === '/'} className="barra-inferior__item">
            <Icone size={18} aria-hidden />
            {rotuloCurto}
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default Layout;
