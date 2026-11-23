import { useState } from 'react';
import { BadgeCheck, Dog, Stethoscope, Users } from 'lucide-react';
import { api, ErroApi } from '../servicos/api';
import { useRecurso } from '../hooks/useRecurso';
import { useNotificacao } from '../contexto/NotificacaoContexto';
import { Aviso, Botao, Carregando, Estrelas, Indicador, Selo } from '../componentes/Basicos';
import { STATUS_VERIFICACAO, formatarData } from '../utils/formato';

export const PainelClinica = () => {
  const { avisar } = useNotificacao();
  const visao = useRecurso(() => api.visaoClinica(), []);
  const [emProcesso, setEmProcesso] = useState<number | null>(null);

  const alterar = async (prestadorId: number, acao: 'verificar' | 'revogar') => {
    setEmProcesso(prestadorId);
    try {
      const atualizado = await api.alterarVerificacao(prestadorId, acao);
      avisar(
        acao === 'verificar'
          ? `${atualizado.nome} agora está verificado e pode receber agendamentos.`
          : `${atualizado.nome} foi revogado e não recebe novos agendamentos.`,
        acao === 'verificar' ? 'sucesso' : 'informacao',
      );
      void visao.recarregar();
    } catch (falha) {
      avisar(
        falha instanceof ErroApi ? falha.message : 'Não foi possível atualizar a verificação.',
        'erro',
      );
    } finally {
      setEmProcesso(null);
    }
  };

  if (visao.carregando) return <Carregando texto="Carregando a rede de cuidado…" />;
  if (visao.erro) return <Aviso>{visao.erro}</Aviso>;
  if (!visao.dados) return null;

  const { clinica, indicadores, profissionais, eventosRecentes } = visao.dados;

  return (
    <div className="pilha-grande">
      <header>
        <span className="rotulo">Área de gestão</span>
        <h1>{clinica.nome}</h1>
        <p>
          Uma rede de cuidado que cresce junto — {clinica.bairro}, {clinica.cidade}.
        </p>
      </header>

      <section className="grade grade--quatro">
        <Indicador
          valor={indicadores.profissionaisParceiros}
          rotulo="Profissionais parceiros"
          icone={<Users size={16} aria-hidden />}
        />
        <Indicador
          valor={indicadores.profissionaisVerificados}
          rotulo="Profissionais verificados"
          icone={<BadgeCheck size={16} aria-hidden />}
        />
        <Indicador
          valor={indicadores.servicosNoMes}
          rotulo="Serviços no mês"
          icone={<Stethoscope size={16} aria-hidden />}
        />
        <Indicador
          valor={indicadores.petsAcompanhados}
          rotulo="Pets acompanhados"
          icone={<Dog size={16} aria-hidden />}
        />
      </section>

      <section className="cartao cartao--generoso">
        <div className="cartao__titulo">
          <div>
            <h2 style={{ fontSize: '1.2rem' }}>Profissionais da comunidade</h2>
            <p className="texto-pequeno">Documentação e status de verificação</p>
          </div>
        </div>

        <div className="tabela-envoltorio">
          <table className="tabela">
            <thead>
              <tr>
                <th scope="col">Profissional</th>
                <th scope="col">Serviço</th>
                <th scope="col">Avaliação</th>
                <th scope="col">Documento</th>
                <th scope="col">Verificação</th>
                <th scope="col">Ação</th>
              </tr>
            </thead>
            <tbody>
              {profissionais.map((profissional) => {
                const info = STATUS_VERIFICACAO[profissional.verificacao.status];
                const verificado = profissional.verificacao.status === 'verificado';
                return (
                  <tr key={profissional.id}>
                    <td>
                      <strong>{profissional.nomeDocumento ?? profissional.nome}</strong>
                      <br />
                      <span className="texto-pequeno texto-suave">{profissional.titulo}</span>
                    </td>
                    <td>{profissional.servico.nome}</td>
                    <td>
                      <Estrelas nota={profissional.avaliacaoMedia} total={profissional.avaliacoesTotal} />
                    </td>
                    <td className="texto-pequeno">{profissional.verificacao.documento ?? '—'}</td>
                    <td>
                      <Selo variante={info.selo}>{info.rotulo}</Selo>
                      {profissional.verificacao.verificadoEm && (
                        <>
                          <br />
                          <span className="texto-pequeno texto-suave">
                            desde {formatarData(profissional.verificacao.verificadoEm)}
                          </span>
                        </>
                      )}
                    </td>
                    <td>
                      <Botao
                        pequeno
                        variante={verificado ? 'alerta' : 'principal'}
                        desabilitado={emProcesso === profissional.id}
                        onClick={() => alterar(profissional.id, verificado ? 'revogar' : 'verificar')}
                      >
                        {verificado ? 'Revogar' : 'Verificar'}
                      </Botao>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {eventosRecentes.length > 0 && (
        <section className="cartao cartao--generoso pilha">
          <h2 style={{ fontSize: '1.2rem' }}>Trilha de auditoria</h2>
          <p className="texto-pequeno">
            Toda mudança de verificação fica registrada com autor, data e status anterior.
          </p>
          <div className="linha-do-tempo">
            {eventosRecentes.map((evento) => (
              <div className="linha-do-tempo__item" key={evento.id}>
                <div className="linha-do-tempo__marcador" aria-hidden>
                  <span className="linha-do-tempo__ponto" />
                  <span className="linha-do-tempo__linha" />
                </div>
                <div>
                  <strong style={{ fontSize: '0.95rem' }}>
                    {evento.acao === 'verificar' ? 'Verificou' : 'Revogou'} {evento.prestadorNome}
                  </strong>
                  <p className="texto-pequeno">
                    {evento.statusAnterior} → {evento.statusNovo} · por {evento.atorNome} ·{' '}
                    {formatarData(evento.criadoEm)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <Aviso variante="atencao">
        PoC: a verificação altera os dados desta base de demonstração e não valida documentos
        reais. Revogar um profissional bloqueia novos agendamentos imediatamente.
      </Aviso>
    </div>
  );
};

export default PainelClinica;
