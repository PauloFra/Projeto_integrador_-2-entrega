import { useState } from 'react';
import { Modal } from './Modal';
import { Aviso, Botao } from './Basicos';
import { api, ErroApi } from '../servicos/api';
import { formatarReais, sugestaoDataHora } from '../utils/formato';
import type { Agendamento, Pet, Prestador } from '../tipos';

interface Props {
  prestador: Prestador | null;
  pets: Pet[];
  onFechar: () => void;
  onAgendado: (agendamento: Agendamento) => void;
  /** Quando vem de "Passeio agora", sugere o próximo horário cheio. */
  imediato?: boolean;
}

const DURACOES = [30, 60, 90, 120];

/**
 * Formulário de solicitação de cuidado.
 * O valor exibido acompanha a duração escolhida, com a mesma regra
 * proporcional aplicada no backend.
 */
export const ModalAgendamento = ({ prestador, pets, onFechar, onAgendado, imediato }: Props) => {
  const [petId, setPetId] = useState<number | ''>(pets[0]?.id ?? '');
  const [inicioEm, setInicioEm] = useState(sugestaoDataHora(imediato ? 2 : 24));
  const [duracao, setDuracao] = useState(prestador?.duracaoMinutos ?? 30);
  const [local, setLocal] = useState('Portaria do edifício');
  const [observacoes, setObservacoes] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [detalhes, setDetalhes] = useState<Record<string, string> | undefined>();
  const [enviando, setEnviando] = useState(false);

  if (!prestador) return null;

  const valorEstimado = Math.round(
    (prestador.precoCentavos * duracao) / prestador.duracaoMinutos,
  );

  const enviar = async () => {
    setErro(null);
    setDetalhes(undefined);

    if (petId === '') {
      setErro('Cadastre ou selecione um pet para continuar.');
      return;
    }

    setEnviando(true);
    try {
      const agendamento = await api.criarAgendamento({
        petId: Number(petId),
        prestadorId: prestador.id,
        inicioEm: `${inicioEm}:00`,
        duracaoMinutos: duracao,
        localEncontro: local.trim() || undefined,
        observacoes: observacoes.trim() || undefined,
      });
      onAgendado(agendamento);
    } catch (falha) {
      if (falha instanceof ErroApi) {
        setErro(falha.message);
        setDetalhes(falha.detalhes);
      } else {
        setErro('Não foi possível concluir o agendamento.');
      }
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal
      aberto
      titulo={`Agendar com ${prestador.nome}`}
      descricao={`${prestador.titulo}${
        prestador.especialidade ? ` · ${prestador.especialidade}` : ''
      }`}
      onFechar={onFechar}
      rodape={
        <>
          <Botao variante="contorno" onClick={onFechar} desabilitado={enviando}>
            Voltar
          </Botao>
          <Botao onClick={enviar} desabilitado={enviando}>
            {enviando ? 'Enviando…' : `Confirmar · ${formatarReais(valorEstimado)}`}
          </Botao>
        </>
      }
    >
      <div className="pilha">
        {erro && (
          <Aviso>
            {erro}
            {detalhes && (
              <span className="texto-pequeno">
                {' '}
                ({Object.values(detalhes).join(' ')})
              </span>
            )}
          </Aviso>
        )}

        <div className="campo">
          <label htmlFor="agendamento-pet">Quem vai ser cuidado</label>
          <select
            id="agendamento-pet"
            value={petId}
            onChange={(evento) => setPetId(Number(evento.target.value))}
          >
            {pets.map((pet) => (
              <option key={pet.id} value={pet.id}>
                {pet.nome}
                {pet.raca ? ` · ${pet.raca}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="campo">
          <label htmlFor="agendamento-inicio">Data e hora</label>
          <input
            id="agendamento-inicio"
            type="datetime-local"
            value={inicioEm}
            min={sugestaoDataHora(0)}
            onChange={(evento) => setInicioEm(evento.target.value)}
          />
        </div>

        <div className="campo">
          <span className="campo__rotulo">Duração</span>
          <div className="abas">
            {DURACOES.map((minutos) => (
              <button
                key={minutos}
                type="button"
                className="abas__item"
                aria-pressed={duracao === minutos}
                onClick={() => setDuracao(minutos)}
              >
                {minutos} min
              </button>
            ))}
          </div>
        </div>

        <div className="campo">
          <label htmlFor="agendamento-local">Ponto de encontro</label>
          <input
            id="agendamento-local"
            type="text"
            value={local}
            maxLength={160}
            onChange={(evento) => setLocal(evento.target.value)}
          />
        </div>

        <div className="campo">
          <label htmlFor="agendamento-observacoes">
            Recado para o profissional (abre a conversa)
          </label>
          <textarea
            id="agendamento-observacoes"
            value={observacoes}
            maxLength={500}
            placeholder="Ex.: a Luna puxa um pouco no começo do passeio."
            onChange={(evento) => setObservacoes(evento.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
};

export default ModalAgendamento;
