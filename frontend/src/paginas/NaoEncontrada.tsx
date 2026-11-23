import { Link } from 'react-router-dom';
import { PawPrint } from 'lucide-react';
import { EstadoVazio } from '../componentes/Basicos';

export const NaoEncontrada = ({ motivo }: { motivo?: string }) => (
  <EstadoVazio
    icone={<PawPrint size={26} />}
    titulo="Essa pegadinha não leva a lugar nenhum"
    descricao={motivo ?? 'A página que você procurou não existe ou foi movida.'}
    acao={
      <Link className="botao botao--principal" to="/">
        Voltar para o início
      </Link>
    }
  />
);

export default NaoEncontrada;
