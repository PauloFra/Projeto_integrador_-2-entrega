import { PawPrint } from 'lucide-react';
import { Link } from 'react-router-dom';

/** Assinatura visual do produto, usada no cabeçalho e na tela de entrada. */
export const Marca = ({ para = '/' }: { para?: string }) => (
  <Link to={para} className="marca" aria-label="Patas Conectadas — início">
    <span className="marca__icone" aria-hidden>
      <PawPrint size={20} />
    </span>
    <span className="marca__texto">
      <strong>patas</strong>
      <span>conectadas</span>
    </span>
  </Link>
);

export default Marca;
