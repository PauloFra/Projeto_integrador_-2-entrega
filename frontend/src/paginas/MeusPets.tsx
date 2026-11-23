import { Link, Navigate } from 'react-router-dom';
import { ArrowRight, Dog } from 'lucide-react';
import { api } from '../servicos/api';
import { useRecurso } from '../hooks/useRecurso';
import { Aviso, Carregando, EstadoVazio } from '../componentes/Basicos';
import { PORTES } from '../utils/formato';

/**
 * Lista os pets do tutor. Quando existe apenas um — caso da jornada da PoC —
 * o perfil dele é aberto direto, sem um passo extra.
 */
export const MeusPets = () => {
  const pets = useRecurso(() => api.pets(), []);

  if (pets.carregando) return <Carregando />;
  if (pets.erro) return <Aviso>{pets.erro}</Aviso>;

  const lista = pets.dados ?? [];

  if (lista.length === 1) return <Navigate to={`/pets/${lista[0].id}`} replace />;

  if (lista.length === 0) {
    return (
      <EstadoVazio
        icone={<Dog size={26} />}
        titulo="Nenhum pet cadastrado ainda"
        descricao="Cadastre seu companheiro para agendar cuidados e guardar a carteira de saúde."
      />
    );
  }

  return (
    <div className="pilha-grande">
      <header>
        <h1>Meus pets</h1>
        <p>Todo o cuidado e carinho, em um só lugar.</p>
      </header>

      <div className="grade grade--tres">
        {lista.map((pet) => (
          <Link key={pet.id} to={`/pets/${pet.id}`} className="cartao cartao--compacto pilha">
            <div className="linha">
              {pet.fotoUrl ? (
                <img
                  src={pet.fotoUrl}
                  alt={pet.nome}
                  width={64}
                  height={64}
                  style={{ borderRadius: 18, objectFit: 'cover' }}
                />
              ) : (
                <span className="item-saude__icone" aria-hidden>
                  <Dog size={22} />
                </span>
              )}
              <div>
                <h3>{pet.nome}</h3>
                <p className="texto-pequeno">
                  {[pet.raca, pet.idadeAnos && `${pet.idadeAnos} anos`, pet.porte && PORTES[pet.porte]]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
            </div>
            <span className="botao botao--texto">
              Ver perfil e saúde <ArrowRight size={14} aria-hidden />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default MeusPets;
