import { useState } from 'react';
import { Star } from 'lucide-react';
import { Modal } from './Modal';
import { Aviso, Botao } from './Basicos';
import { api, ErroApi } from '../servicos/api';
import type { Agendamento } from '../tipos';

interface Props {
  agendamento: Agendamento | null;
  onFechar: () => void;
  onAvaliado: (notaMedia: number) => void;
}

/** Avaliação de 1 a 5 estrelas — fecha o ciclo do cuidado concluído. */
export const ModalAvaliacao = ({ agendamento, onFechar, onAvaliado }: Props) => {
  const [nota, setNota] = useState(5);
  const [comentario, setComentario] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (!agendamento) return null;

  const enviar = async () => {
    setErro(null);
    setEnviando(true);
    try {
      const resultado = await api.avaliar(agendamento.id, nota, comentario.trim() || undefined);
      onAvaliado(resultado.prestador.avaliacaoMedia);
    } catch (falha) {
      setErro(falha instanceof ErroApi ? falha.message : 'Não foi possível enviar a avaliação.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal
      aberto
      titulo="Como foi o cuidado?"
      descricao={`${agendamento.titulo} · ${agendamento.prestador.nome}`}
      onFechar={onFechar}
      rodape={
        <>
          <Botao variante="contorno" onClick={onFechar} desabilitado={enviando}>
            Depois
          </Botao>
          <Botao onClick={enviar} desabilitado={enviando}>
            {enviando ? 'Enviando…' : 'Enviar avaliação'}
          </Botao>
        </>
      }
    >
      <div className="pilha">
        {erro && <Aviso>{erro}</Aviso>}

        <div className="campo">
          <span className="campo__rotulo">Sua nota</span>
          <div className="linha" role="radiogroup" aria-label="Nota de 1 a 5 estrelas">
            {[1, 2, 3, 4, 5].map((valor) => (
              <button
                key={valor}
                type="button"
                role="radio"
                aria-checked={nota === valor}
                aria-label={`${valor} estrela${valor > 1 ? 's' : ''}`}
                onClick={() => setNota(valor)}
                style={{ padding: 2 }}
              >
                <Star
                  size={28}
                  aria-hidden
                  style={{
                    color: valor <= nota ? 'var(--mel)' : 'var(--borda-forte)',
                    fill: valor <= nota ? 'var(--mel)' : 'transparent',
                  }}
                />
              </button>
            ))}
          </div>
        </div>

        <div className="campo">
          <label htmlFor="avaliacao-comentario">Comentário (opcional)</label>
          <textarea
            id="avaliacao-comentario"
            value={comentario}
            maxLength={500}
            placeholder="Conte como foi o cuidado com o seu pet."
            onChange={(evento) => setComentario(evento.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
};

export default ModalAvaliacao;
