const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Usar o banco na raiz do projeto (mesmo que o bot usa)
const dbPath = path.join(__dirname, '..', 'clinica.db');
const db = new sqlite3.Database(dbPath);

// Criar tabelas compatíveis com o bot
db.serialize(() => {
  // Tabela de unidades
  db.run(`
    CREATE TABLE IF NOT EXISTS unidades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      descricao TEXT,
      endereco TEXT,
      ativa INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabela de departamentos
  db.run(`
    CREATE TABLE IF NOT EXISTS departamentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      unidade_id INTEGER NOT NULL,
      nome TEXT NOT NULL,
      mensagem TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (unidade_id) REFERENCES unidades(id)
    )
  `);

  // Tabela de vendedores
  db.run(`
    CREATE TABLE IF NOT EXISTS vendedores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      unidade_id INTEGER NOT NULL,
      nome TEXT NOT NULL,
      numero TEXT NOT NULL,
      ativo INTEGER DEFAULT 1,
      ordem INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (unidade_id) REFERENCES unidades(id)
    )
  `);

  // Tabela de valores/serviços
  db.run(`
    CREATE TABLE IF NOT EXISTS valores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      unidade_id INTEGER NOT NULL,
      servico TEXT NOT NULL,
      preco TEXT NOT NULL,
      ordem INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (unidade_id) REFERENCES unidades(id)
    )
  `);

  // Tabela de interações/logs
  db.run(`
    CREATE TABLE IF NOT EXISTS interacoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      tipo TEXT NOT NULL,
      dados TEXT,
      data_hora DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabela de conversas (status por usuario)
  db.run(`
    CREATE TABLE IF NOT EXISTS conversas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      unidade_id INTEGER,
      departamento_id INTEGER,
      status TEXT NOT NULL,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_message_at DATETIME
    )
  `);

  // Tabela de fila de atendimentos por departamento
  db.run(`
    CREATE TABLE IF NOT EXISTS fila_atendimentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      unidade_id INTEGER NOT NULL,
      departamento_id INTEGER NOT NULL,
      status TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_message_at DATETIME,
      last_notified_at DATETIME
    )
  `);

  // Tabela de clientes
  db.run(`
    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      cpf TEXT UNIQUE NOT NULL,
      telefone TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabela de profissionais
  db.run(`
    CREATE TABLE IF NOT EXISTS profissionais (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      unidade_id INTEGER NOT NULL,
      nome TEXT NOT NULL,
      numero TEXT NOT NULL,
      ativo INTEGER DEFAULT 1,
      ordem INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (unidade_id) REFERENCES unidades(id)
    )
  `);

  // Tabela de atendimentos (solicitacoes para vendedor/profissional)
  db.run(`
    CREATE TABLE IF NOT EXISTS atendimentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      unidade_id INTEGER NOT NULL,
      tipo_atendente TEXT NOT NULL,
      atendente_id INTEGER NOT NULL,
      atendente_nome TEXT NOT NULL,
      cliente_nome TEXT,
      cliente_cpf TEXT,
      cliente_telefone TEXT,
      assunto TEXT,
      status TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);



  // Tabela de configurações gerais do bot
  db.run(`
    CREATE TABLE IF NOT EXISTS configuracoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chave TEXT UNIQUE NOT NULL,
      valor TEXT,
      descricao TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Erro ao criar tabela configuracoes:', err);
    } else {
      // Inserir configurações padrão se não existirem
      const configs = [
        ['mensagem_boas_vindas', '👋 Olá! Seja bem-vindo(a)!\n\nEu sou o assistente virtual da *Clínica Atividade*.\n\nComo posso ajudá-lo hoje?', 'Mensagem inicial enviada ao usuário'],
        ['mensagem_menu_principal', '📋 *Menu Principal*\n\nEscolha uma das opções:', 'Texto do menu principal'],
        ['mensagem_opcao_invalida', '❌ Opção inválida!\n\nPor favor, digite o *número* da opção desejada.', 'Mensagem quando usuário digita opção inválida'],
        ['mensagem_horario_atendimento', '🕐 *Horário de Atendimento*\n\nSegunda a Sexta: 08:00 às 18:00\nSábado: 08:00 às 12:00', 'Horário de funcionamento'],
        ['bot_ativo', '1', 'Bot está ativo (1) ou inativo (0)'],
        ['tempo_reload_config', '300000', 'Tempo em ms para recarregar configurações (padrão: 5 min)'],
        ['fila_intervalo_aviso', '30', 'Intervalo em segundos para avisar posicao na fila'],
        ['fila_timeout_abandono', '1200', 'Tempo em segundos para marcar abandono na fila']
      ];
      
      configs.forEach(([chave, valor, descricao]) => {
        db.run(
          'INSERT OR IGNORE INTO configuracoes (chave, valor, descricao) VALUES (?, ?, ?)',
          [chave, valor, descricao]
        );
      });
    }
  });

  // Inserir dados iniciais
  db.get("SELECT COUNT(*) as count FROM unidades", (err, row) => {
    if (row.count === 0) {
      // Inserir unidades
      db.run(`
        INSERT INTO unidades (nome, descricao, endereco, ativa) VALUES 
        ('Atividade Laboral', 'Saúde ocupacional e medicina do trabalho', 'Rua do Cruzeiro\nTatuí/SP', 1),
        ('Contra o Tempo', 'Academia e exercícios físicos', 'Rua do Cruzeiro\nTatuí/SP', 1)
      `);

      // Inserir departamentos
      db.run(`
        INSERT INTO departamentos (unidade_id, nome, mensagem) VALUES 
        (1, 'Administrativo', '📞 *Administrativo*\n\nEstamos direcionando sua solicitação.\nUm atendente entrará em contato em breve.'),
        (1, 'Vendas', '💼 Escolha um de nossos consultores'),
        (2, 'Administrativo', '📞 *Administrativo*\n\nEstamos direcionando sua solicitação.\nUm atendente entrará em contato em breve.'),
        (2, 'Vendas', '💼 Escolha um de nossos consultores')
      `);

      // Inserir vendedores Atividade Laboral
      db.run(`
        INSERT INTO vendedores (nome, numero, unidade_id, ativo, ordem) VALUES 
        ('Maria Silva', '5515999990001', 1, 1, 1),
        ('João Santos', '5515999990002', 1, 1, 2),
        ('Ana Costa', '5515999990003', 1, 1, 3)
      `);

      // Inserir vendedores Contra o Tempo
      db.run(`
        INSERT INTO vendedores (nome, numero, unidade_id, ativo, ordem) VALUES 
        ('Pedro Oliveira', '5515999990004', 2, 1, 1),
        ('Julia Mendes', '5515999990005', 2, 1, 2),
        ('Carlos Souza', '5515999990006', 2, 1, 3)
      `);

      // Inserir valores Atividade Laboral
      db.run(`
        INSERT INTO valores (servico, preco, unidade_id, ordem) VALUES 
        ('Exame Admissional', '150,00', 1, 1),
        ('Exame Periódico', '120,00', 1, 2),
        ('Exame Demissional', '100,00', 1, 3),
        ('ASO Completo', '180,00', 1, 4),
        ('PCMSO (por funcionário)', '80,00', 1, 5),
        ('Consulta Médica Ocupacional', '200,00', 1, 6)
      `);

      // Inserir valores Contra o Tempo
      db.run(`
        INSERT INTO valores (servico, preco, unidade_id, ordem) VALUES 
        ('Plano Básico (3x semana)', '120,00', 2, 1),
        ('Plano Intermediário (5x semana)', '180,00', 2, 2),
        ('Plano Premium (ilimitado)', '250,00', 2, 3),
        ('Personal Trainer (hora)', '80,00', 2, 4),
        ('Avaliação Física Completa', '50,00', 2, 5)
      `);

      console.log('✅ Dados iniciais inseridos no banco de dados');
    }
  });
});

module.exports = db;
