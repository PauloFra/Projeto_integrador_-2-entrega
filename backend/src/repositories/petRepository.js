import { getDatabase } from '../database/connection.js';

const mapearPet = (linha) =>
  linha
    ? {
        id: linha.id,
        tutorId: linha.tutor_id,
        nome: linha.nome,
        especie: linha.especie,
        raca: linha.raca,
        sexo: linha.sexo,
        idadeAnos: linha.idade_anos,
        pesoKg: linha.peso_kg,
        porte: linha.porte,
        castrado: Boolean(linha.castrado),
        microchipado: Boolean(linha.microchipado),
        sociavel: Boolean(linha.sociavel),
        sobre: linha.sobre,
        fotoUrl: linha.foto_url,
        criadoEm: linha.criado_em,
      }
    : null;

const mapearRegistro = (linha) => ({
  id: linha.id,
  petId: linha.pet_id,
  tipo: linha.tipo,
  nome: linha.nome,
  aplicadoEm: linha.aplicado_em,
  proximaDose: linha.proxima_dose,
  status: linha.status,
  observacao: linha.observacao,
});

const mapearNota = (linha) => ({
  id: linha.id,
  petId: linha.pet_id,
  clinicaNome: linha.clinica_nome,
  veterinarioNome: linha.veterinario_nome,
  crmv: linha.crmv,
  conteudo: linha.conteudo,
  registradoEm: linha.registrado_em,
});

const mapearConsulta = (linha) => ({
  id: linha.id,
  petId: linha.pet_id,
  titulo: linha.titulo,
  inicioEm: linha.inicio_em,
  veterinarioNome: linha.veterinario_nome,
  status: linha.status,
  observacao: linha.observacao,
  clinicaNome: linha.clinica_nome,
});

export const petRepository = {
  listarPorTutor(tutorId) {
    return getDatabase()
      .prepare('SELECT * FROM pets WHERE tutor_id = ? ORDER BY criado_em, id')
      .all(tutorId)
      .map(mapearPet);
  },

  buscarPorId(id) {
    return mapearPet(getDatabase().prepare('SELECT * FROM pets WHERE id = ?').get(id));
  },

  criar(dados) {
    const { lastInsertRowid } = getDatabase()
      .prepare(
        `INSERT INTO pets (tutor_id, nome, especie, raca, sexo, idade_anos, peso_kg, porte,
                           castrado, microchipado, sociavel, sobre, foto_url)
         VALUES (@tutorId, @nome, @especie, @raca, @sexo, @idadeAnos, @pesoKg, @porte,
                 @castrado, @microchipado, @sociavel, @sobre, @fotoUrl)`,
      )
      .run({
        especie: 'cachorro',
        raca: null,
        sexo: null,
        idadeAnos: null,
        pesoKg: null,
        porte: null,
        castrado: 0,
        microchipado: 0,
        sociavel: 1,
        sobre: null,
        fotoUrl: null,
        ...dados,
      });
    return this.buscarPorId(Number(lastInsertRowid));
  },

  atualizar(id, dados) {
    const atual = getDatabase().prepare('SELECT * FROM pets WHERE id = ?').get(id);
    if (!atual) return null;

    const mesclado = {
      nome: dados.nome ?? atual.nome,
      raca: dados.raca ?? atual.raca,
      sexo: dados.sexo ?? atual.sexo,
      idadeAnos: dados.idadeAnos ?? atual.idade_anos,
      pesoKg: dados.pesoKg ?? atual.peso_kg,
      porte: dados.porte ?? atual.porte,
      castrado: dados.castrado === undefined ? atual.castrado : Number(Boolean(dados.castrado)),
      microchipado:
        dados.microchipado === undefined ? atual.microchipado : Number(Boolean(dados.microchipado)),
      sociavel: dados.sociavel === undefined ? atual.sociavel : Number(Boolean(dados.sociavel)),
      sobre: dados.sobre ?? atual.sobre,
      fotoUrl: dados.fotoUrl ?? atual.foto_url,
      id,
    };

    getDatabase()
      .prepare(
        `UPDATE pets SET nome = @nome, raca = @raca, sexo = @sexo, idade_anos = @idadeAnos,
                         peso_kg = @pesoKg, porte = @porte, castrado = @castrado,
                         microchipado = @microchipado, sociavel = @sociavel, sobre = @sobre,
                         foto_url = @fotoUrl
         WHERE id = @id`,
      )
      .run(mesclado);
    return this.buscarPorId(id);
  },

  listarRegistrosSaude(petId) {
    return getDatabase()
      .prepare('SELECT * FROM registros_saude WHERE pet_id = ? ORDER BY aplicado_em DESC, id DESC')
      .all(petId)
      .map(mapearRegistro);
  },

  criarRegistroSaude(dados) {
    const { lastInsertRowid } = getDatabase()
      .prepare(
        `INSERT INTO registros_saude (pet_id, tipo, nome, aplicado_em, proxima_dose, status, observacao)
         VALUES (@petId, @tipo, @nome, @aplicadoEm, @proximaDose, @status, @observacao)`,
      )
      .run({ proximaDose: null, status: 'em_dia', observacao: null, ...dados });

    return mapearRegistro(
      getDatabase().prepare('SELECT * FROM registros_saude WHERE id = ?').get(Number(lastInsertRowid)),
    );
  },

  listarNotasVeterinarias(petId) {
    return getDatabase()
      .prepare(
        `SELECT nv.*, c.nome AS clinica_nome
         FROM notas_veterinarias nv
         LEFT JOIN clinicas c ON c.id = nv.clinica_id
         WHERE nv.pet_id = ?
         ORDER BY nv.registrado_em DESC`,
      )
      .all(petId)
      .map(mapearNota);
  },

  listarConsultas(petId) {
    return getDatabase()
      .prepare(
        `SELECT cc.*, c.nome AS clinica_nome
         FROM consultas_clinica cc
         JOIN clinicas c ON c.id = cc.clinica_id
         WHERE cc.pet_id = ?
         ORDER BY cc.inicio_em DESC`,
      )
      .all(petId)
      .map(mapearConsulta);
  },

  /** Próxima consulta confirmada (cartão "Próximo cuidado"). */
  buscarProximaConsulta(petId, agoraIso) {
    const linha = getDatabase()
      .prepare(
        `SELECT cc.*, c.nome AS clinica_nome
         FROM consultas_clinica cc
         JOIN clinicas c ON c.id = cc.clinica_id
         WHERE cc.pet_id = ? AND cc.status = 'confirmada' AND cc.inicio_em >= ?
         ORDER BY cc.inicio_em
         LIMIT 1`,
      )
      .get(petId, agoraIso);
    return linha ? mapearConsulta(linha) : null;
  },

  contarPorTutor(tutorId) {
    return getDatabase()
      .prepare('SELECT COUNT(*) AS total FROM pets WHERE tutor_id = ?')
      .get(tutorId).total;
  },

  mapearPet,
};

export default petRepository;
