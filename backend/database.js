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

  // Inserir dados iniciais
  db.get("SELECT COUNT(*) as count FROM unidades", (err, row) => {
    if (row.count === 0) {
      // Inserir unidades
      db.run(`
        INSERT INTO unidades (nome, descricao, icone, ordem) VALUES 
        ('Atividade Laboral', 'Saúde ocupacional e medicina do trabalho', '💼', 1),
        ('Contra o Tempo', 'Academia e exercícios físicos', '💪', 2)
      `);

      // Inserir departamentos
      db.run(`
        INSERT INTO departamentos (nome, unidade_id, ordem) VALUES 
        ('Administrativo', 1, 1),
        ('Vendas', 1, 2),
        ('Agendamento', 1, 3),
        ('Financeiro', 1, 4),
        ('Administrativo', 2, 1),
        ('Vendas', 2, 2),
        ('Agendamento', 2, 3),
        ('Financeiro', 2, 4)
      `);

      // Inserir vendedores Atividade Laboral
      db.run(`
        INSERT INTO vendedores (nome, telefone, unidade_id, ordem) VALUES 
        ('Maria Silva', '5515999990001', 1, 1),
        ('João Santos', '5515999990002', 1, 2),
        ('Ana Costa', '5515999990003', 1, 3)
      `);

      // Inserir vendedores Contra o Tempo
      db.run(`
        INSERT INTO vendedores (nome, telefone, unidade_id, ordem) VALUES 
        ('Pedro Oliveira', '5515999990004', 2, 1),
        ('Julia Mendes', '5515999990005', 2, 2),
        ('Carlos Souza', '5515999990006', 2, 3)
      `);

      // Inserir serviços Atividade Laboral
      db.run(`
        INSERT INTO servicos (nome, valor, unidade_id, ordem) VALUES 
        ('Exame Admissional', 150.00, 1, 1),
        ('Exame Periódico', 120.00, 1, 2),
        ('Exame Demissional', 100.00, 1, 3),
        ('ASO Completo', 180.00, 1, 4),
        ('PCMSO (por funcionário)', 80.00, 1, 5),
        ('Consulta Médica Ocupacional', 200.00, 1, 6)
      `);

      // Inserir serviços Contra o Tempo
      db.run(`
        INSERT INTO servicos (nome, descricao, valor, unidade_id, ordem) VALUES 
        ('Plano Básico', '3x semana', 120.00, 2, 1),
        ('Plano Intermediário', '5x semana', 180.00, 2, 2),
        ('Plano Premium', 'ilimitado', 250.00, 2, 3),
        ('Aula experimental', 'Primeira aula', 0.00, 2, 4),
        ('Personal trainer', 'por hora', 80.00, 2, 5),
        ('Avaliação física', 'Avaliação completa', 50.00, 2, 6)
      `);

      // Inserir endereços
      db.run(`
        INSERT INTO enderecos (rua, cidade, estado, unidade_id) VALUES 
        ('Rua do Cruzeiro', 'Tatuí', 'SP', 1),
        ('Rua do Cruzeiro', 'Tatuí', 'SP', 2)
      `);

      // Inserir configurações
      db.run(`
        INSERT INTO configuracoes (chave, valor, descricao) VALUES 
        ('mensagem_boas_vindas', '🏥 *Bem-vindo à Clínica Atividade!*\n\nSomos uma multiclínica com duas unidades especializadas:', 'Mensagem inicial do bot'),
        ('horario_atendimento', 'Segunda a Sexta: 08:00 - 18:00\nSábado: 08:00 - 12:00', 'Horário de atendimento'),
        ('telefone_principal', '(15) 3251-0000', 'Telefone principal'),
        ('email_contato', 'contato@clinicaatividade.com.br', 'Email de contato')
      `);

      console.log('✅ Dados iniciais inseridos no banco de dados');
    }
  });
});

module.exports = db;
