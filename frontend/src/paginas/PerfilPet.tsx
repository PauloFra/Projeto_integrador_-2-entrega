import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  Plus,
  ShieldCheck,
  Stethoscope,
  Syringe,
} from 'lucide-react';
import { api, ErroApi } from '../servicos/api';
import { useRecurso } from '../hooks/useRecurso';
import { useNotificacao } from '../contexto/NotificacaoContexto';
import { Aviso, Botao, Carregando, Estrelas, Selo } from '../componentes/Basicos';
import { Modal } from '../componentes/Modal';
import {
  PORTES,
  STATUS_SAUDE,
  formatarData,
  formatarDiaMes,
  formatarQuando,
} from '../utils/formato';

const TIPOS_SAUDE = [
  { valor: 'vacina', rotulo: 'Vacina' },
  { valor: 'vermifugo', rotulo: 'Vermífugo' },
  { valor: 'antipulgas', rotulo: 'Antipulgas' },
  { valor: 'exame', rotulo: 'Exame' },
];

const hojeIso = () => new Date().toISOString().slice(0, 10);

export const PerfilPet = () => {
  const { id } = useParams();
  const { avisar } = useNotificacao();
  const pet = useRecurso(() => api.pet(Number(id)), [id]);

  const [modalAberto, setModalAberto] = useState(false);
  const [tipo, setTipo] = useState('vacina');
  const [nome, setNome] = useState('');
  const [aplicadoEm, setAplicadoEm] = useState(hojeIso());
  const [proximaDose, setProximaDose] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (pet.carregando) return <Carregando texto="Abrindo o cantinho do seu pet…" />;
  if (pet.erro) return <Aviso>{pet.erro}</Aviso>;
  if (!pet.dados) return null;

  const dados = pet.dados;
  const artigo = dados.sexo === 'femea' ? 'da' : 'do';

  const salvarRegistro = async () => {
    setErro(null);
    if (nome.trim().length < 2) {
      setErro('Informe o nome da vacina, dose ou exame.');
      return;
    }
    setEnviando(true);
    try {
      await api.adicionarRegistroSaude(dados.id, {
        tipo,
        nome: nome.trim(),
        aplicadoEm: `${aplicadoEm}T09:00:00`,
        proximaDose: proximaDose ? `${proximaDose}T09:00:00` : undefined,
      });
      setModalAberto(false);
      setNome('');
      setProximaDose('');
      avisar('Carteira de saúde atualizada.');
      void pet.recarregar();
    } catch (falha) {
      setErro(falha instanceof ErroApi ? falha.message : 'Não foi possível salvar o registro.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="pilha-grande">
      <header className="linha-espalhada">
        <div>
          <span className="rotulo">O cantinho {artigo} {dados.nome}</span>
          <h1>Todo o cuidado e carinho, em um só lugar.</h1>
        </div>
        {dados.saude.emDia && <Selo variante="principal">Saúde em dia</Selo>}
      </header>

      <section className="cartao cartao--generoso linha" style={{ alignItems: 'flex-start' }}>
        {dados.fotoUrl && (
          <img
            src={dados.fotoUrl}
            alt={dados.nome}
            width={104}
            height={104}
            style={{ borderRadius: 28, objectFit: 'cover' }}
          />
        )}
        <div className="pilha" style={{ gap: 8 }}>
          <h2>
            {dados.nome} {dados.sexo === 'femea' ? '♀' : '♂'}
          </h2>
          <p className="texto-pequeno">
            {[
              dados.raca,
              dados.idadeAnos && `${dados.idadeAnos} anos`,
              dados.pesoKg && `${dados.pesoKg.toLocaleString('pt-BR')} kg`,
              dados.porte && PORTES[dados.porte],
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
          <div className="profissional__etiquetas">
            {dados.castrado && <Selo variante="neutro">Castrada</Selo>}
            {dados.sociavel && <Selo variante="neutro">Sociável</Selo>}
            {dados.microchipado && <Selo variante="neutro">Microchipada</Selo>}
          </div>
        </div>
      </section>

      <div className="grade grade--dois">
        {/* ------------------------------------------------ saúde e prevenção */}
        <section className="cartao cartao--generoso">
          <div className="cartao__titulo">
            <h2 style={{ fontSize: '1.2rem' }}>Saúde e prevenção</h2>
            <Botao pequeno variante="suave" onClick={() => setModalAberto(true)}>
              <Plus size={14} aria-hidden /> Registrar
            </Botao>
          </div>

          {dados.saude.registros.map((registro) => {
            const info = STATUS_SAUDE[registro.status];
            return (
              <div key={registro.id} className="item-saude">
                <span className="item-saude__icone" aria-hidden>
                  <Syringe size={18} />
                </span>
                <div className="item-saude__corpo">
                  <strong>{registro.nome}</strong>
                  <span>
                    Aplicada em {formatarData(registro.aplicadoEm)}
                    {registro.proximaDose && ` · Próxima: ${formatarData(registro.proximaDose)}`}
                  </span>
                </div>
                <Selo variante={info.selo}>{info.rotulo}</Selo>
              </div>
            );
          })}
        </section>

        {/* -------------------------------------------- histórico de cuidados */}
        <section className="cartao cartao--generoso">
          <div className="cartao__titulo">
            <h2 style={{ fontSize: '1.2rem' }}>Histórico de cuidados</h2>
          </div>

          {dados.historico.length === 0 && (
            <p className="texto-pequeno">Nenhum cuidado concluído até agora.</p>
          )}

          <div className="linha-do-tempo">
            {dados.historico.map((item, indice) => (
              <div className="linha-do-tempo__item" key={`${item.titulo}-${indice}`}>
                <div className="linha-do-tempo__marcador" aria-hidden>
                  <span className="linha-do-tempo__ponto" />
                  <span className="linha-do-tempo__linha" />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="linha" style={{ flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: '0.95rem' }}>{item.titulo}</strong>
                    {item.nota !== null && <Estrelas nota={item.nota} />}
                  </div>
                  <p className="texto-pequeno">
                    {formatarData(item.quando)}
                    {item.detalhe && ` · ${item.detalhe}`} · {item.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grade grade--dois">
        {/* ------------------------------------------------------- sobre ela */}
        {dados.sobre && (
          <section className="cartao cartao--generoso pilha">
            <h2 style={{ fontSize: '1.2rem' }}>Um pouquinho sobre {artigo === 'da' ? 'ela' : 'ele'}</h2>
            <p>{dados.sobre}</p>
          </section>
        )}

        {/* --------------------------------------- observações veterinárias */}
        {dados.saude.notas.length > 0 && (
          <section className="cartao cartao--generoso pilha">
            <h2 className="linha" style={{ fontSize: '1.2rem' }}>
              <Stethoscope size={18} aria-hidden /> Observações veterinárias
            </h2>
            {dados.saude.notas.map((nota) => (
              <div key={nota.id} className="pilha" style={{ gap: 6 }}>
                <p>{nota.conteudo}</p>
                <p className="texto-pequeno">
                  {nota.veterinarioNome}
                  {nota.crmv && ` · ${nota.crmv}`}
                  {nota.clinicaNome && ` · ${nota.clinicaNome}`} · {formatarData(nota.registradoEm)}
                </p>
              </div>
            ))}
          </section>
        )}
      </div>

      {/* ------------------------------------------------------ próximo cuidado */}
      <section className="cartao cartao--generoso cartao--destaque linha-espalhada">
        <div className="linha">
          {dados.proximaConsulta ? (
            <>
              <div className="agendamento__data" aria-hidden>
                <strong>{formatarDiaMes(dados.proximaConsulta.inicioEm).dia}</strong>
                <span>{formatarDiaMes(dados.proximaConsulta.inicioEm).mes}</span>
              </div>
              <div>
                <span className="rotulo">Próximo cuidado</span>
                <h3>{dados.proximaConsulta.titulo}</h3>
                <p className="texto-pequeno">
                  {formatarQuando(dados.proximaConsulta.inicioEm)} ·{' '}
                  {dados.proximaConsulta.clinicaNome}
                </p>
              </div>
            </>
          ) : (
            <div>
              <span className="rotulo">Próximo cuidado</span>
              <h3>Nada agendado por aqui</h3>
              <p className="texto-pequeno">
                Que tal reservar um passeio com um profissional verificado?
              </p>
            </div>
          )}
        </div>

        <div className="linha">
          {dados.proximaConsulta && (
            <Selo variante="principal">
              <CalendarDays size={12} aria-hidden /> Consulta confirmada
            </Selo>
          )}
          <Link className="botao botao--principal" to="/">
            Agendar um cuidado <ArrowRight size={16} aria-hidden />
          </Link>
        </div>
      </section>

      <p className="linha texto-pequeno">
        <ShieldCheck size={16} aria-hidden style={{ color: 'var(--principal)' }} />
        Registros visíveis apenas para você e para as clínicas parceiras autorizadas.
      </p>

      {/* ------------------------------------------- modal de novo registro */}
      <Modal
        aberto={modalAberto}
        titulo="Registrar na carteira de saúde"
        descricao={`Novo item de prevenção ${artigo} ${dados.nome}`}
        onFechar={() => setModalAberto(false)}
        rodape={
          <>
            <Botao variante="contorno" onClick={() => setModalAberto(false)} desabilitado={enviando}>
              Cancelar
            </Botao>
            <Botao onClick={salvarRegistro} desabilitado={enviando}>
              {enviando ? 'Salvando…' : 'Salvar registro'}
            </Botao>
          </>
        }
      >
        <div className="pilha">
          {erro && <Aviso>{erro}</Aviso>}

          <div className="campo">
            <label htmlFor="saude-tipo">Tipo</label>
            <select id="saude-tipo" value={tipo} onChange={(evento) => setTipo(evento.target.value)}>
              {TIPOS_SAUDE.map((item) => (
                <option key={item.valor} value={item.valor}>
                  {item.rotulo}
                </option>
              ))}
            </select>
          </div>

          <div className="campo">
            <label htmlFor="saude-nome">Nome / produto</label>
            <input
              id="saude-nome"
              type="text"
              value={nome}
              maxLength={120}
              placeholder="Ex.: Vacina V10"
              onChange={(evento) => setNome(evento.target.value)}
            />
          </div>

          <div className="campo">
            <label htmlFor="saude-aplicado">Aplicado em</label>
            <input
              id="saude-aplicado"
              type="date"
              value={aplicadoEm}
              onChange={(evento) => setAplicadoEm(evento.target.value)}
            />
          </div>

          <div className="campo">
            <label htmlFor="saude-proxima">Próxima dose (opcional)</label>
            <input
              id="saude-proxima"
              type="date"
              value={proximaDose}
              onChange={(evento) => setProximaDose(evento.target.value)}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PerfilPet;
