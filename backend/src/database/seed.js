/**
 * Carga de dados de demonstração da PoC Patas Conectadas.
 *
 * Executar:  npm run db:seed   (dentro de backend/)
 *
 * O script é idempotente: limpa as tabelas e recria a base inteira, por isso
 * pode ser rodado quantas vezes for necessário durante a apresentação.
 *
 * Todas as datas são relativas ao dia da execução, de modo que a demonstração
 * nunca aparece "vencida": a agenda sempre tem passeios futuros e o histórico
 * sempre tem passeios recentes.
 */
import { pathToFileURL } from 'node:url';
import config from '../config/index.js';
import { getDatabase, closeDatabase } from './connection.js';
import { migrate } from './migrate.js';
import { hashPassword, gerarCodigo } from '../utils/crypto.js';

const SENHA_DEMO = 'patas123';

// ---------------------------------------------------------------------------
// Helpers de data — tudo em ISO local sem fuso ("2026-11-25T10:00:00")
// ---------------------------------------------------------------------------
const agora = new Date();

const pad = (valor) => String(valor).padStart(2, '0');

const isoLocal = (data) =>
  `${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(data.getDate())}T` +
  `${pad(data.getHours())}:${pad(data.getMinutes())}:00`;

/** Data relativa a hoje, com hora cheia definida. */
const emDias = (dias, hora = 10, minuto = 0) => {
  const data = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + dias, hora, minuto);
  return isoLocal(data);
};

/** Data dentro do mês corrente, no dia informado (usada no histórico mensal). */
const noMes = (dia, hora = 9) =>
  isoLocal(new Date(agora.getFullYear(), agora.getMonth(), dia, hora, 0));

const somenteData = (iso) => iso.slice(0, 10);

/** Último dia do mês corrente que já passou (pelo menos 1). */
const ultimoDiaPassado = Math.max(1, agora.getDate() - 1);

// ---------------------------------------------------------------------------
// Dados de catálogo
// ---------------------------------------------------------------------------
const SERVICOS = [
  { slug: 'passeio', nome: 'Passeio', descricao: 'Passeios com dog walkers verificados.', icone: 'footprints', ordem: 1 },
  { slug: 'pet-sitter', nome: 'Pet sitter', descricao: 'Cuidado e hospedagem domiciliar.', icone: 'home', ordem: 2 },
  { slug: 'banho-tosa', nome: 'Banho e tosa', descricao: 'Higiene e estética com transporte opcional.', icone: 'scissors', ordem: 3 },
  { slug: 'veterinario', nome: 'Veterinário', descricao: 'Consultas, vacinas e check-ups.', icone: 'stethoscope', ordem: 4 },
];

// Camila mora na Vila Mariana (São Paulo) — origem das distâncias calculadas.
const CAMILA = { lat: -23.5893, lng: -46.6349 };

const PRESTADORES = [
  {
    nome: 'Roberto Neves',
    nomeDocumento: 'Roberto Carlos Neves',
    email: 'roberto@patasconectadas.app',
    telefone: '(11) 98877-1020',
    avatar: '/imagens/roberto.webp',
    servico: 'passeio',
    titulo: 'Dog walker',
    especialidade: 'Pets de todos os portes',
    bio: 'Passeio há 6 anos pela Vila Mariana e região. Envio fotos e o trajeto completo ao fim de cada passeio.',
    precoCentavos: 3500,
    duracaoMinutos: 30,
    avaliacaoMedia: 4.9,
    avaliacoesTotal: 128,
    disponivelAgora: 1,
    verificacao: 'verificado',
    documento: 'RG 23.114.882-0 · Curso de manejo canino (2023)',
    coordenada: { lat: -23.5821, lng: -46.6349 }, // ~0,8 km de Camila
  },
  {
    nome: 'Mariana Oliveira',
    nomeDocumento: 'Mariana Oliveira Prado',
    email: 'mariana@patasconectadas.app',
    telefone: '(11) 97766-3344',
    avatar: '/imagens/mariana.webp',
    servico: 'passeio',
    titulo: 'Dog walker',
    especialidade: 'Pets ansiosos',
    bio: 'Especializada em pets que precisam de um ritmo mais calmo. Formação em comportamento animal.',
    precoCentavos: 4000,
    duracaoMinutos: 30,
    avaliacaoMedia: 5.0,
    avaliacoesTotal: 96,
    disponivelAgora: 1,
    verificacao: 'verificado',
    documento: 'RG 31.902.556-4 · Comportamento animal (2022)',
    coordenada: { lat: -23.6001, lng: -46.6349 }, // ~1,2 km
  },
  {
    nome: 'Lucas Ferreira',
    nomeDocumento: 'Lucas Ferreira da Silva',
    email: 'lucas@patasconectadas.app',
    telefone: '(11) 96655-7788',
    avatar: '/imagens/lucas.webp',
    servico: 'passeio',
    titulo: 'Dog walker',
    especialidade: 'Passeios tranquilos',
    bio: 'Passeios curtos e leves, ideais para pets idosos ou em recuperação.',
    precoCentavos: 3000,
    duracaoMinutos: 30,
    avaliacaoMedia: 4.8,
    avaliacoesTotal: 74,
    disponivelAgora: 1,
    verificacao: 'verificado',
    documento: 'RG 40.223.117-8 · Primeiros socorros pet (2024)',
    coordenada: { lat: -23.5893, lng: -46.6192 }, // ~1,6 km
  },
  {
    nome: 'Ana Beatriz Santos',
    nomeDocumento: 'Ana Beatriz Santos Correia',
    email: 'ana@patasconectadas.app',
    telefone: '(11) 95544-2211',
    avatar: null,
    servico: 'pet-sitter',
    titulo: 'Pet sitter',
    especialidade: 'Hospedagem domiciliar',
    bio: 'Recebo no máximo dois pets por vez, com relatório de rotina três vezes ao dia.',
    precoCentavos: 6000,
    duracaoMinutos: 240,
    avaliacaoMedia: 4.9,
    avaliacoesTotal: 58,
    disponivelAgora: 1,
    verificacao: 'verificado',
    documento: 'RG 28.441.903-2 · Vistoria domiciliar aprovada',
    coordenada: { lat: -23.5747, lng: -46.6189 }, // ~2,3 km
  },
  {
    nome: 'Pedro Henrique Lima',
    nomeDocumento: 'Pedro Henrique Lima Barros',
    email: 'pedro@patasconectadas.app',
    telefone: '(11) 94433-6677',
    avatar: null,
    servico: 'banho-tosa',
    titulo: 'Banho e tosa',
    especialidade: 'Pelagem longa e dupla',
    bio: 'Atendimento sem gaiola, um pet por horário, com produtos hipoalergênicos.',
    precoCentavos: 7000,
    duracaoMinutos: 90,
    avaliacaoMedia: 4.7,
    avaliacoesTotal: 41,
    disponivelAgora: 0,
    verificacao: 'verificado',
    documento: 'RG 19.774.610-5 · Groomer certificado (2021)',
    coordenada: { lat: -23.5893, lng: -46.6653 }, // ~3,1 km
  },
  {
    nome: 'Dra. Mariana Costa',
    nomeDocumento: 'Mariana Costa Rezende',
    email: 'dra.mariana@patasconectadas.app',
    telefone: '(11) 93322-8899',
    avatar: null,
    servico: 'veterinario',
    titulo: 'Veterinário',
    especialidade: 'Clínica geral e vacinação',
    bio: 'Responsável técnica da Clínica Pet Vida. Atende consultas de rotina e check-ups preventivos.',
    precoCentavos: 18000,
    duracaoMinutos: 40,
    avaliacaoMedia: 5.0,
    avaliacoesTotal: 23,
    disponivelAgora: 1,
    verificacao: 'pendente', // aguardando validação no painel da clínica
    documento: 'CRMV-SP 42.518 · Diploma em análise',
    coordenada: { lat: -23.5963, lng: -46.6273 }, // ~1,1 km
    vinculadaAClinica: true,
  },
];

const TUTORES_EXTRA = [
  { nome: 'Juliana Mendes', email: 'juliana@exemplo.com', pets: ['Thor'] },
  { nome: 'André Ribeiro', email: 'andre@exemplo.com', pets: ['Mel'] },
  { nome: 'Fernanda Lopes', email: 'fernanda@exemplo.com', pets: ['Bidu', 'Nina', 'Amora', 'Chico', 'Lola'] },
  { nome: 'Carlos Eduardo Martins', email: 'carlos@exemplo.com', pets: ['Bento', 'Maya', 'Simba', 'Pipoca', 'Dora'] },
  { nome: 'Patrícia Souza', email: 'patricia@exemplo.com', pets: ['Fred', 'Zoé', 'Max', 'Cacau', 'Toby'] },
  { nome: 'Rafael Almeida', email: 'rafael@exemplo.com', pets: ['Jade', 'Bob', 'Fiona', 'Rex', 'Mimi'] },
  { nome: 'Beatriz Nogueira', email: 'beatriz@exemplo.com', pets: ['Pingo', 'Nala', 'Billy', 'Juno', 'Lili'] },
  { nome: 'Tiago Moreira', email: 'tiago@exemplo.com', pets: ['Otto', 'Kiara', 'Duque', 'Melissa'] },
];

const RACAS = ['Vira-lata', 'Golden Retriever', 'Beagle', 'Shih Tzu', 'Border Collie', 'Poodle', 'Labrador'];

// ---------------------------------------------------------------------------
// Execução da carga
// ---------------------------------------------------------------------------
export const seed = () => {
  migrate();
  const db = getDatabase();

  const limpar = db.transaction(() => {
    const tabelas = [
      'eventos_verificacao',
      'mensagens',
      'conversas',
      'avaliacoes',
      'agendamentos',
      'consultas_clinica',
      'notas_veterinarias',
      'registros_saude',
      'pets',
      'prestadores',
      'clinicas',
      'servicos',
      'usuarios',
    ];
    db.pragma('foreign_keys = OFF');
    for (const tabela of tabelas) db.prepare(`DELETE FROM ${tabela}`).run();
    db.prepare("DELETE FROM sqlite_sequence WHERE name IN (" +
      tabelas.map(() => '?').join(', ') + ')').run(...tabelas);
    db.pragma('foreign_keys = ON');
  });
  limpar();

  const senhaHash = hashPassword(SENHA_DEMO);

  const inserirUsuario = db.prepare(`
    INSERT INTO usuarios (nome, email, senha_hash, papel, telefone, bairro, cidade, latitude, longitude, avatar_url)
    VALUES (@nome, @email, @senhaHash, @papel, @telefone, @bairro, @cidade, @latitude, @longitude, @avatarUrl)
  `);
  const inserirServico = db.prepare(`
    INSERT INTO servicos (slug, nome, descricao, icone, ordem)
    VALUES (@slug, @nome, @descricao, @icone, @ordem)
  `);
  const inserirClinica = db.prepare(`
    INSERT INTO clinicas (nome, cnpj, bairro, cidade, latitude, longitude, telefone, responsavel_id)
    VALUES (@nome, @cnpj, @bairro, @cidade, @latitude, @longitude, @telefone, @responsavelId)
  `);
  const inserirPrestador = db.prepare(`
    INSERT INTO prestadores (
      usuario_id, servico_id, nome_documento, titulo, especialidade, bio, preco_centavos,
      duracao_minutos, avaliacao_media, avaliacoes_total, disponivel_agora,
      verificacao_status, verificado_em, documento, clinica_id
    ) VALUES (
      @usuarioId, @servicoId, @nomeDocumento, @titulo, @especialidade, @bio, @precoCentavos,
      @duracaoMinutos, @avaliacaoMedia, @avaliacoesTotal, @disponivelAgora,
      @verificacaoStatus, @verificadoEm, @documento, @clinicaId
    )
  `);
  const inserirPet = db.prepare(`
    INSERT INTO pets (tutor_id, nome, especie, raca, sexo, idade_anos, peso_kg, porte,
                      castrado, microchipado, sociavel, sobre, foto_url)
    VALUES (@tutorId, @nome, @especie, @raca, @sexo, @idadeAnos, @pesoKg, @porte,
            @castrado, @microchipado, @sociavel, @sobre, @fotoUrl)
  `);
  const inserirSaude = db.prepare(`
    INSERT INTO registros_saude (pet_id, tipo, nome, aplicado_em, proxima_dose, status, observacao)
    VALUES (@petId, @tipo, @nome, @aplicadoEm, @proximaDose, @status, @observacao)
  `);
  const inserirNota = db.prepare(`
    INSERT INTO notas_veterinarias (pet_id, clinica_id, veterinario_nome, crmv, conteudo, registrado_em)
    VALUES (@petId, @clinicaId, @veterinarioNome, @crmv, @conteudo, @registradoEm)
  `);
  const inserirAgendamento = db.prepare(`
    INSERT INTO agendamentos (codigo, tutor_id, pet_id, prestador_id, servico_id, titulo, inicio_em,
                              duracao_minutos, valor_centavos, status, local_encontro, observacoes, concluido_em)
    VALUES (@codigo, @tutorId, @petId, @prestadorId, @servicoId, @titulo, @inicioEm,
            @duracaoMinutos, @valorCentavos, @status, @localEncontro, @observacoes, @concluidoEm)
  `);
  const inserirAvaliacao = db.prepare(`
    INSERT INTO avaliacoes (agendamento_id, autor_id, prestador_id, nota, comentario)
    VALUES (@agendamentoId, @autorId, @prestadorId, @nota, @comentario)
  `);
  const inserirConsulta = db.prepare(`
    INSERT INTO consultas_clinica (pet_id, clinica_id, titulo, inicio_em, veterinario_nome, status, observacao)
    VALUES (@petId, @clinicaId, @titulo, @inicioEm, @veterinarioNome, @status, @observacao)
  `);
  const inserirConversa = db.prepare(`
    INSERT INTO conversas (agendamento_id, tutor_id, prestador_id) VALUES (?, ?, ?)
  `);
  const inserirMensagem = db.prepare(`
    INSERT INTO mensagens (conversa_id, autor_id, conteudo, lida, enviado_em)
    VALUES (?, ?, ?, ?, ?)
  `);

  const carga = db.transaction(() => {
    // --- catálogo de serviços -------------------------------------------------
    const servicoIdPorSlug = {};
    for (const servico of SERVICOS) {
      const { lastInsertRowid } = inserirServico.run(servico);
      servicoIdPorSlug[servico.slug] = Number(lastInsertRowid);
    }

    // --- tutora principal da jornada -----------------------------------------
    const camilaId = Number(
      inserirUsuario.run({
        nome: 'Camila Andrade',
        email: 'camila@patasconectadas.app',
        senhaHash,
        papel: 'tutor',
        telefone: '(11) 99123-4567',
        bairro: 'Vila Mariana',
        cidade: 'São Paulo',
        latitude: CAMILA.lat,
        longitude: CAMILA.lng,
        avatarUrl: null,
      }).lastInsertRowid,
    );

    // --- gestor da clínica ----------------------------------------------------
    const gestorClinicaId = Number(
      inserirUsuario.run({
        nome: 'Clínica Pet Vida',
        email: 'clinica@patasconectadas.app',
        senhaHash,
        papel: 'clinica',
        telefone: '(11) 3456-7890',
        bairro: 'Vila Mariana',
        cidade: 'São Paulo',
        latitude: -23.5963,
        longitude: -46.6273,
        avatarUrl: null,
      }).lastInsertRowid,
    );

    const clinicaId = Number(
      inserirClinica.run({
        nome: 'Clínica Pet Vida',
        cnpj: '12.345.678/0001-90',
        bairro: 'Vila Mariana',
        cidade: 'São Paulo',
        latitude: -23.5963,
        longitude: -46.6273,
        telefone: '(11) 3456-7890',
        responsavelId: gestorClinicaId,
      }).lastInsertRowid,
    );

    // --- prestadores ----------------------------------------------------------
    const prestadorIdPorEmail = {};
    for (const p of PRESTADORES) {
      const usuarioId = Number(
        inserirUsuario.run({
          nome: p.nome,
          email: p.email,
          senhaHash,
          papel: 'prestador',
          telefone: p.telefone,
          bairro: 'Vila Mariana',
          cidade: 'São Paulo',
          latitude: p.coordenada.lat,
          longitude: p.coordenada.lng,
          avatarUrl: p.avatar,
        }).lastInsertRowid,
      );

      const prestadorId = Number(
        inserirPrestador.run({
          usuarioId,
          servicoId: servicoIdPorSlug[p.servico],
          nomeDocumento: p.nomeDocumento,
          titulo: p.titulo,
          especialidade: p.especialidade,
          bio: p.bio,
          precoCentavos: p.precoCentavos,
          duracaoMinutos: p.duracaoMinutos,
          avaliacaoMedia: p.avaliacaoMedia,
          avaliacoesTotal: p.avaliacoesTotal,
          disponivelAgora: p.disponivelAgora,
          verificacaoStatus: p.verificacao,
          verificadoEm: p.verificacao === 'verificado' ? emDias(-120, 9) : null,
          documento: p.documento,
          // todos os prestadores desta PoC fazem parte da rede da Clínica Pet Vida
          clinicaId,
        }).lastInsertRowid,
      );
      prestadorIdPorEmail[p.email] = prestadorId;
    }

    // --- Luna, a estrela da jornada ------------------------------------------
    const lunaId = Number(
      inserirPet.run({
        tutorId: camilaId,
        nome: 'Luna',
        especie: 'cachorro',
        raca: 'Vira-lata',
        sexo: 'femea',
        idadeAnos: 3,
        pesoKg: 14.5,
        porte: 'medio',
        castrado: 1,
        microchipado: 1,
        sociavel: 1,
        sobre:
          'Carinhosa, curiosa e apaixonada por bolinhas. A Luna adora cheirar tudo durante os passeios e fazer novos amigos.',
        fotoUrl: '/imagens/luna.webp',
      }).lastInsertRowid,
    );

    // Carteira de saúde da Luna (datas relativas para nunca ficarem vencidas)
    const registrosLuna = [
      {
        tipo: 'vacina',
        nome: 'Vacina V10',
        aplicadoEm: somenteData(emDias(-256)),
        proximaDose: somenteData(emDias(109)),
        status: 'em_dia',
        observacao: 'Dose anual aplicada na Clínica Pet Vida.',
      },
      {
        tipo: 'vacina',
        nome: 'Vacina antirrábica',
        aplicadoEm: somenteData(emDias(-256)),
        proximaDose: somenteData(emDias(109)),
        status: 'em_dia',
        observacao: 'Reforço anual.',
      },
      {
        tipo: 'vermifugo',
        nome: 'Vermífugo — Drontal Plus',
        aplicadoEm: somenteData(emDias(-39)),
        proximaDose: somenteData(emDias(53)),
        status: 'em_dia',
        observacao: 'Dose única conforme peso.',
      },
      {
        tipo: 'antipulgas',
        nome: 'Antipulgas — NexGard',
        aplicadoEm: somenteData(emDias(-18)),
        proximaDose: somenteData(emDias(12)),
        status: 'protegida',
        observacao: 'Aplicação mensal.',
      },
    ];
    for (const registro of registrosLuna) inserirSaude.run({ petId: lunaId, ...registro });

    inserirNota.run({
      petId: lunaId,
      clinicaId,
      veterinarioNome: 'Dra. Mariana Costa',
      crmv: 'CRMV-SP 42.518',
      conteudo:
        'Boa condição geral, peso adequado. Leve sensibilidade de pele: utilizar shampoo hipoalergênico. Sem restrições a passeios moderados.',
      registradoEm: somenteData(emDias(-72)),
    });

    // Consulta já realizada + próximo check-up confirmado
    inserirConsulta.run({
      petId: lunaId,
      clinicaId,
      titulo: 'Consulta de rotina',
      inicioEm: emDias(-72, 11),
      veterinarioNome: 'Dra. Mariana Costa',
      status: 'realizada',
      observacao: 'Avaliação semestral preventiva.',
    });
    inserirConsulta.run({
      petId: lunaId,
      clinicaId,
      titulo: 'Check-up da Luna',
      inicioEm: emDias(2, 10),
      veterinarioNome: 'Dra. Mariana Costa',
      status: 'confirmada',
      observacao: 'Consulta confirmada pela clínica.',
    });

    // --- demais tutores e pets ------------------------------------------------
    const petsSecundarios = []; // { id, nome, tutorId, tutorNome }
    TUTORES_EXTRA.forEach((tutor, indiceTutor) => {
      const tutorId = Number(
        inserirUsuario.run({
          nome: tutor.nome,
          email: tutor.email,
          senhaHash,
          papel: 'tutor',
          telefone: null,
          bairro: 'Vila Mariana',
          cidade: 'São Paulo',
          latitude: CAMILA.lat,
          longitude: CAMILA.lng,
          avatarUrl: null,
        }).lastInsertRowid,
      );

      tutor.pets.forEach((nomePet, indicePet) => {
        const petId = Number(
          inserirPet.run({
            tutorId,
            nome: nomePet,
            especie: 'cachorro',
            raca: RACAS[(indiceTutor + indicePet) % RACAS.length],
            sexo: indicePet % 2 === 0 ? 'macho' : 'femea',
            idadeAnos: 1 + ((indiceTutor + indicePet) % 10),
            pesoKg: 5 + ((indiceTutor * 3 + indicePet * 2) % 25),
            porte: ['pequeno', 'medio', 'grande'][(indiceTutor + indicePet) % 3],
            castrado: 1,
            microchipado: (indiceTutor + indicePet) % 2,
            sociavel: 1,
            sobre: null,
            fotoUrl: null,
          }).lastInsertRowid,
        );
        petsSecundarios.push({ id: petId, nome: nomePet, tutorId, tutorNome: tutor.nome });
      });
    });

    const thor = petsSecundarios.find((pet) => pet.nome === 'Thor');
    const mel = petsSecundarios.find((pet) => pet.nome === 'Mel');

    // --- agendamentos ---------------------------------------------------------
    const robertoId = prestadorIdPorEmail['roberto@patasconectadas.app'];
    const marianaId = prestadorIdPorEmail['mariana@patasconectadas.app'];
    const lucasId = prestadorIdPorEmail['lucas@patasconectadas.app'];
    const anaId = prestadorIdPorEmail['ana@patasconectadas.app'];
    const servicoPasseio = servicoIdPorSlug.passeio;
    const servicoSitter = servicoIdPorSlug['pet-sitter'];

    const criarAgendamento = (dados) =>
      Number(
        inserirAgendamento.run({
          codigo: gerarCodigo(),
          localEncontro: 'Portaria do edifício',
          observacoes: null,
          concluidoEm: dados.status === 'concluido' ? dados.inicioEm : null,
          ...dados,
        }).lastInsertRowid,
      );

    // Histórico da Luna (aparece em "Meus passeios" e no perfil dela)
    const passeioIbirapuera = criarAgendamento({
      tutorId: camilaId,
      petId: lunaId,
      prestadorId: robertoId,
      servicoId: servicoPasseio,
      titulo: 'Passeio no Ibirapuera',
      inicioEm: emDias(-4, 8, 30),
      duracaoMinutos: 30,
      valorCentavos: 3500,
      status: 'concluido',
      observacoes: 'Luna adorou a volta pelo parque.',
    });
    inserirAvaliacao.run({
      agendamentoId: passeioIbirapuera,
      autorId: camilaId,
      prestadorId: robertoId,
      nota: 5,
      comentario: 'Roberto mandou fotos do trajeto todo. Luna voltou tranquila e cansada.',
    });

    const passeioManha = criarAgendamento({
      tutorId: camilaId,
      petId: lunaId,
      prestadorId: marianaId,
      servicoId: servicoPasseio,
      titulo: 'Passeio da manhã',
      inicioEm: emDias(-7, 7, 30),
      duracaoMinutos: 60,
      valorCentavos: 8000,
      status: 'concluido',
    });
    inserirAvaliacao.run({
      agendamentoId: passeioManha,
      autorId: camilaId,
      prestadorId: marianaId,
      nota: 5,
      comentario: 'Muito atenciosa com o ritmo da Luna.',
    });

    // Volume do mês corrente, distribuído entre todos os pets da base.
    // Serve de lastro para os indicadores do prestador e do painel da clínica.
    let cursor = 0;
    const proximoPet = () => {
      const pet = petsSecundarios[cursor % petsSecundarios.length];
      cursor += 1;
      return pet;
    };

    const gerarHistorico = (prestadorId, servicoId, quantidade, duracao, valor, titulo) => {
      for (let i = 0; i < quantidade; i += 1) {
        const pet = proximoPet();
        const dia = 1 + (i % ultimoDiaPassado);
        criarAgendamento({
          tutorId: pet.tutorId,
          petId: pet.id,
          prestadorId,
          servicoId,
          titulo,
          inicioEm: noMes(dia, 8 + (i % 9)),
          duracaoMinutos: duracao,
          valorCentavos: valor,
          status: 'concluido',
        });
      }
    };

    // Roberto: 24 passeios no mês × R$ 35 = R$ 840 (indicador da agenda dele).
    // O passeio da Luna acima já é um deles, faltam 23.
    gerarHistorico(robertoId, servicoPasseio, 23, 30, 3500, 'Passeio da tarde');
    // Mariana: 12 no mês (o passeio da Luna já conta, faltam 11).
    gerarHistorico(marianaId, servicoPasseio, 11, 30, 4000, 'Passeio tranquilo');
    gerarHistorico(lucasId, servicoPasseio, 8, 30, 3000, 'Passeio leve');
    gerarHistorico(anaId, servicoSitter, 2, 240, 6000, 'Hospedagem de fim de semana');

    // Próximos atendimentos do Roberto (agenda do prestador).
    // Se o seed rodar depois das 16h, o passeio de "hoje" vai para amanhã.
    const horaAtual = agora.getHours();
    const agendamentosFuturos = [
      {
        pet: thor,
        titulo: 'Passeio do Thor',
        inicioEm: horaAtual < 16 ? emDias(0, 17) : emDias(1, 17),
        duracaoMinutos: 30,
        valorCentavos: 3500,
        mensagens: [
          { autor: 'tutor', conteudo: 'Oi Roberto! O Thor está te esperando às 17h, combinado?' },
          { autor: 'prestador', conteudo: 'Combinado, Juliana! Chego 5 minutinhos antes.' },
        ],
      },
      {
        pet: mel,
        titulo: 'Passeio da Mel',
        inicioEm: emDias(1, 9),
        duracaoMinutos: 60,
        valorCentavos: 7000,
        mensagens: [
          { autor: 'tutor', conteudo: 'Bom dia! A Mel pode fazer o trajeto mais curto amanhã?' },
        ],
      },
    ];

    for (const futuro of agendamentosFuturos) {
      const agendamentoId = criarAgendamento({
        tutorId: futuro.pet.tutorId,
        petId: futuro.pet.id,
        prestadorId: robertoId,
        servicoId: servicoPasseio,
        titulo: futuro.titulo,
        inicioEm: futuro.inicioEm,
        duracaoMinutos: futuro.duracaoMinutos,
        valorCentavos: futuro.valorCentavos,
        status: 'confirmado',
      });

      const conversaId = Number(
        inserirConversa.run(agendamentoId, futuro.pet.tutorId, robertoId).lastInsertRowid,
      );
      const robertoUsuarioId = db
        .prepare('SELECT usuario_id FROM prestadores WHERE id = ?')
        .get(robertoId).usuario_id;

      futuro.mensagens.forEach((mensagem, indice) => {
        inserirMensagem.run(
          conversaId,
          mensagem.autor === 'tutor' ? futuro.pet.tutorId : robertoUsuarioId,
          mensagem.conteudo,
          1,
          emDias(-1, 18 + indice),
        );
      });
    }
  });

  carga();

  // --- resumo da carga ------------------------------------------------------
  const contar = (tabela) => db.prepare(`SELECT COUNT(*) AS total FROM ${tabela}`).get().total;
  return {
    arquivo: config.databaseFile,
    usuarios: contar('usuarios'),
    prestadores: contar('prestadores'),
    pets: contar('pets'),
    agendamentos: contar('agendamentos'),
    avaliacoes: contar('avaliacoes'),
    conversas: contar('conversas'),
    mensagens: contar('mensagens'),
    registrosSaude: contar('registros_saude'),
    consultasClinica: contar('consultas_clinica'),
  };
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const resumo = seed();
  console.log('[seed] carga de demonstração concluída');
  console.table(resumo);
  console.log(`[seed] senha de todos os usuários de demonstração: ${SENHA_DEMO}`);
  closeDatabase();
}

export default seed;
