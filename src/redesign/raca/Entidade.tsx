import { Navigate } from 'react-router-dom';
import type { IRaca } from '../../types/catalogo';

export const Entidade = (_props: { raca: IRaca }) => <Navigate to="/entidades" replace />;

export default Entidade;
