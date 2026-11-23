import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ArrowRight, Hospital, PawPrint, ShieldCheck, Footprints } from 'lucide-react';
import { Marca } from '../componentes/Marca';
import { Aviso, Botao, Carregando } from '../componentes/Basicos';
import { useSessao } from '../contexto/SessaoContexto';
import { ErroApi } from '../servicos/api';

/** Perfis de demonstração — todos usam a mesma senha carregada no seed. */
const PERFIS = [
  {
    email: 'camila@patasconectadas.app',
    nome: 'Camila Andrade',
    descricao: 'Tutora da Luna — jornada principal da PoC',
    icone: PawPrint,
  },
  {
    email: 'roberto@patasconectadas.app',
    nome: 'Roberto Neves',
    descricao: 'Dog walker — agenda do prestador',
    icone: Footprints,
  },
  {
    email: 'clinica@patasconectadas.app',
    nome: 'Clínica Pet Vida',
    descricao: 'Gestão — verificação dos profissionais',
    icone: Hospital,
  },
];

const SENHA_DEMO = 'patas123';

export const Entrar = () => {
  const { usuario, carregando, entrar } = useSessao();
  const navegar = useNavigate();
  const [email, setEmail] = useState(PERFIS[0].email);
  const [senha, setSenha] = useState(SENHA_DEMO);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (carregando) return <Carregando texto="Verificando sua sessão…" />;
  if (usuario) return <Navigate to="/" replace />;

  const autenticar = async (emailAlvo = email, senhaAlvo = senha) => {
    setErro(null);
    setEnviando(true);
    try {
      await entrar(emailAlvo, senhaAlvo);
      navegar('/', { replace: true });
    } catch (falha) {
      setErro(falha instanceof ErroApi ? falha.message : 'Não foi possível entrar agora.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="conteudo entrar">
      <section className="entrar__apresentacao pilha">
        <Marca para="/entrar" />
        <h1>
          Cuidado que aproxima.
          <br />
          Mais tranquilidade para você.
        </h1>
        <p>
          Encontre passeadores e profissionais de confiança, acompanhe a saúde do seu pet e
          converse com quem cuida dele — tudo em um só lugar.
        </p>
        <ul className="pilha texto-pequeno" style={{ gap: 10 }}>
          <li className="linha">
            <ShieldCheck size={16} aria-hidden style={{ color: 'var(--principal)' }} />
            Documentação verificada por clínicas parceiras
          </li>
          <li className="linha">
            <PawPrint size={16} aria-hidden style={{ color: 'var(--principal)' }} />
            Carteira de saúde e histórico de cuidados sempre à mão
          </li>
          <li className="linha">
            <Footprints size={16} aria-hidden style={{ color: 'var(--principal)' }} />
            Do agendamento à avaliação, sem sair do aplicativo
          </li>
        </ul>
      </section>

      <section className="cartao cartao--generoso pilha">
        <div>
          <h2>Entrar na demonstração</h2>
          <p className="texto-pequeno">
            Escolha um dos perfis carregados pelo script de dados ou informe as credenciais.
          </p>
        </div>

        {erro && <Aviso>{erro}</Aviso>}

        <div className="perfis">
          {PERFIS.map((perfil) => (
            <button
              key={perfil.email}
              type="button"
              className="perfil"
              disabled={enviando}
              onClick={() => {
                setEmail(perfil.email);
                setSenha(SENHA_DEMO);
                void autenticar(perfil.email, SENHA_DEMO);
              }}
            >
              <span className="marca__icone" aria-hidden>
                <perfil.icone size={18} />
              </span>
              <span style={{ flex: 1 }}>
                <strong>{perfil.nome}</strong>
                <span>{perfil.descricao}</span>
              </span>
              <ArrowRight size={16} aria-hidden />
            </button>
          ))}
        </div>

        <form
          className="pilha"
          onSubmit={(evento) => {
            evento.preventDefault();
            void autenticar();
          }}
        >
          <div className="campo">
            <label htmlFor="entrar-email">E-mail</label>
            <input
              id="entrar-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(evento) => setEmail(evento.target.value)}
              required
            />
          </div>

          <div className="campo">
            <label htmlFor="entrar-senha">Senha</label>
            <input
              id="entrar-senha"
              type="password"
              autoComplete="current-password"
              value={senha}
              onChange={(evento) => setSenha(evento.target.value)}
              required
            />
          </div>

          <Botao tipo="submit" largo desabilitado={enviando}>
            {enviando ? 'Entrando…' : 'Entrar'}
          </Botao>
        </form>

        <p className="texto-pequeno">
          Dados de demonstração: todos os perfis usam a senha <strong>{SENHA_DEMO}</strong>.
        </p>
      </section>
    </div>
  );
};

export default Entrar;
