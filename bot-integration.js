const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Conectar ao banco de dados
const dbPath = path.join(__dirname, 'clinica.db');
const db = new sqlite3.Database(dbPath);

// Inicializar banco de dados (criar tabelas se não existirem)
function inicializarBanco() {
    return new Promise((resolve, reject) => {
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
                    reject(err);
                } else {
                    console.log('✅ Banco de dados inicializado');
                    // Inserir dados de exemplo se não houver unidades
                    db.get('SELECT COUNT(*) as count FROM unidades', (err, row) => {
                        if (err) {
                            reject(err);
                        } else if (row.count === 0) {
                            console.log('📝 Inserindo dados de exemplo...');
                            inserirDadosExemplo().then(resolve).catch(reject);
                        } else {
                            resolve();
                        }
                    });
                }
            });
        });
    });
}

// Inserir dados de exemplo
function inserirDadosExemplo() {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // Unidade 1: Atividade Laboral
            db.run(`
                INSERT INTO unidades (nome, descricao, endereco, ativa) 
                VALUES ('Atividade Laboral', 'Saúde ocupacional e medicina do trabalho', 'Rua do Cruzeiro\nTatuí/SP', 1)
            `, function(err) {
                if (err) return reject(err);
                const unidade1Id = this.lastID;

                // Vendedores Atividade Laboral
                db.run(`INSERT INTO vendedores (unidade_id, nome, numero, ordem) VALUES (?, 'Maria Silva', '5515999990001', 1)`, [unidade1Id]);
                db.run(`INSERT INTO vendedores (unidade_id, nome, numero, ordem) VALUES (?, 'João Santos', '5515999990002', 2)`, [unidade1Id]);
                db.run(`INSERT INTO vendedores (unidade_id, nome, numero, ordem) VALUES (?, 'Ana Costa', '5515999990003', 3)`, [unidade1Id]);

                // Valores Atividade Laboral
                db.run(`INSERT INTO valores (unidade_id, servico, preco, ordem) VALUES (?, 'Exame Admissional', '150,00', 1)`, [unidade1Id]);
                db.run(`INSERT INTO valores (unidade_id, servico, preco, ordem) VALUES (?, 'Exame Periódico', '120,00', 2)`, [unidade1Id]);
                db.run(`INSERT INTO valores (unidade_id, servico, preco, ordem) VALUES (?, 'Exame Demissional', '100,00', 3)`, [unidade1Id]);
                db.run(`INSERT INTO valores (unidade_id, servico, preco, ordem) VALUES (?, 'ASO Completo', '180,00', 4)`, [unidade1Id]);

                // Departamentos Atividade Laboral
                db.run(`INSERT INTO departamentos (unidade_id, nome, mensagem) VALUES (?, 'Administrativo', '📞 *Administrativo*\n\nEstamos direcionando sua solicitação.\nUm atendente entrará em contato em breve.')`, [unidade1Id]);
                db.run(`INSERT INTO departamentos (unidade_id, nome, mensagem) VALUES (?, 'Vendas', '💼 Escolha um de nossos consultores')`, [unidade1Id]);
            });

            // Unidade 2: Contra o Tempo
            db.run(`
                INSERT INTO unidades (nome, descricao, endereco, ativa) 
                VALUES ('Contra o Tempo', 'Academia e exercícios físicos', 'Rua do Cruzeiro\nTatuí/SP', 1)
            `, function(err) {
                if (err) return reject(err);
                const unidade2Id = this.lastID;

                // Vendedores Contra o Tempo
                db.run(`INSERT INTO vendedores (unidade_id, nome, numero, ordem) VALUES (?, 'Pedro Oliveira', '5515999990004', 1)`, [unidade2Id]);
                db.run(`INSERT INTO vendedores (unidade_id, nome, numero, ordem) VALUES (?, 'Julia Mendes', '5515999990005', 2)`, [unidade2Id]);
                db.run(`INSERT INTO vendedores (unidade_id, nome, numero, ordem) VALUES (?, 'Carlos Souza', '5515999990006', 3)`, [unidade2Id]);

                // Valores Contra o Tempo
                db.run(`INSERT INTO valores (unidade_id, servico, preco, ordem) VALUES (?, 'Plano Básico (3x semana)', '120,00', 1)`, [unidade2Id]);
                db.run(`INSERT INTO valores (unidade_id, servico, preco, ordem) VALUES (?, 'Plano Intermediário (5x semana)', '180,00', 2)`, [unidade2Id]);
                db.run(`INSERT INTO valores (unidade_id, servico, preco, ordem) VALUES (?, 'Plano Premium (ilimitado)', '250,00', 3)`, [unidade2Id]);
                db.run(`INSERT INTO valores (unidade_id, servico, preco, ordem) VALUES (?, 'Personal Trainer (hora)', '80,00', 4)`, [unidade2Id]);

                // Departamentos Contra o Tempo
                db.run(`INSERT INTO departamentos (unidade_id, nome, mensagem) VALUES (?, 'Administrativo', '📞 *Administrativo*\n\nEstamos direcionando sua solicitação.\nUm atendente entrará em contato em breve.')`, [unidade2Id]);
                db.run(`INSERT INTO departamentos (unidade_id, nome, mensagem) VALUES (?, 'Vendas', '💼 Escolha um de nossos consultores')`, [unidade2Id], (err) => {
                    if (err) reject(err);
                    else {
                        console.log('✅ Dados de exemplo inseridos com sucesso!');
                        // Inserir configurações iniciais
                        inserirConfiguracoesIniciais().then(resolve).catch(reject);
                    }
                });
            });
        });
    });
}

// Inserir configurações iniciais
function inserirConfiguracoesIniciais() {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
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

            let completed = 0;
            configs.forEach(([chave, valor, descricao]) => {
                db.run(
                    'INSERT OR IGNORE INTO configuracoes (chave, valor, descricao) VALUES (?, ?, ?)',
                    [chave, valor, descricao],
                    (err) => {
                        if (err) return reject(err);
                        completed++;
                        if (completed === configs.length) {
                            console.log('✅ Configurações iniciais inseridas');
                            resolve();
                        }
                    }
                );
            });
        });
    });
}

// Carregar configurações dinâmicas do banco
async function carregarConfiguracoes() {
    return new Promise((resolve, reject) => {
        const config = {
            unidades: [],
            departamentos: {},
            vendedores: {},
            valores: {},
            config: {}
        };

        // Carregar configurações gerais primeiro
        db.all('SELECT chave, valor FROM configuracoes', (err, configuracoes) => {
            if (err) return reject(err);
            
            configuracoes.forEach(c => {
                config.config[c.chave] = c.valor;
            });

            // Carregar unidades
            db.all('SELECT * FROM unidades WHERE ativa = 1 ORDER BY id', (err, unidades) => {
                if (err) return reject(err);
                config.unidades = unidades;

                // Carregar departamentos
                db.all('SELECT * FROM departamentos', (err, departamentos) => {
                    if (err) return reject(err);
                    departamentos.forEach(d => {
                        if (!config.departamentos[d.unidade_id]) {
                            config.departamentos[d.unidade_id] = [];
                        }
                        config.departamentos[d.unidade_id].push(d);
                    });

                    // Carregar vendedores
                    db.all('SELECT * FROM vendedores WHERE ativo = 1 ORDER BY ordem', (err, vendedores) => {
                        if (err) return reject(err);
                        vendedores.forEach(v => {
                            if (!config.vendedores[v.unidade_id]) {
                                config.vendedores[v.unidade_id] = [];
                            }
                            config.vendedores[v.unidade_id].push(v);
                        });

                        // Carregar valores
                        db.all('SELECT * FROM valores ORDER BY unidade_id, ordem', (err, valores) => {
                            if (err) return reject(err);
                            valores.forEach(v => {
                                if (!config.valores[v.unidade_id]) {
                                    config.valores[v.unidade_id] = [];
                                }
                                config.valores[v.unidade_id].push(v);
                            });

                            resolve(config);
                        });
                    });
                });
            });
        });
    });
}


// Gerar menu de unidades
function gerarMenuUnidades(unidades) {
    let mensagem = '🏥 *Bem-vindo à Clínica Atividade!*\n\n';
    mensagem += 'Somos uma multiclínica com unidades especializadas:\n\n';
    
    unidades.forEach((unidade, index) => {
        mensagem += `${index + 1}️⃣ - *${unidade.nome}*\n`;
        mensagem += `     (${unidade.descricao})\n\n`;
    });
    
    mensagem += 'Digite o número da opção desejada.';
    return mensagem;
}

// Gerar menu de opções da unidade
function gerarMenuUnidade(unidade) {
    let mensagem = `${unidade.nome === 'Atividade Laboral' ? '💼' : '💪'} *${unidade.nome}*\n`;
    mensagem += `_${unidade.descricao}_\n\n`;
    mensagem += '1️⃣ - Endereço\n';
    mensagem += '2️⃣ - Valores\n';
    mensagem += '3️⃣ - Falar com Atendente\n';
    mensagem += '0️⃣ - Voltar ao menu principal\n\n';
    mensagem += 'Digite o número da opção desejada.';
    return mensagem;
}

// Gerar mensagem de endereço
function gerarMensagemEndereco(unidade) {
    let mensagem = '📍 *Nossa Localização*\n\n';
    mensagem += '📌 Endereço:\n';
    mensagem += unidade.endereco + '\n\n';
    mensagem += '_Como chegar:_\n';
    mensagem += 'Estamos localizados na região central de Tatuí.\n\n';
    mensagem += 'Digite *0* para voltar ou *menu* para o menu principal.';
    return mensagem;
}

// Gerar mensagem de valores
function gerarMensagemValores(unidade, valores) {
    let mensagem = `💰 *Valores - ${unidade.nome}*\n\n`;
    
    if (valores && valores.length > 0) {
        valores.forEach(v => {
            mensagem += `🔹 ${v.servico}: R$ ${v.preco}\n`;
        });
        mensagem += '\n💡 _Entre em contato para mais informações!_\n\n';
    } else {
        mensagem += '📋 Entre em contato para consultar nossos valores.\n\n';
    }
    
    mensagem += 'Digite *0* para voltar ou *menu* para o menu principal.';
    return mensagem;
}

// Gerar menu de departamentos
function gerarMenuDepartamentos(unidade, departamentos) {
    let mensagem = `👥 *Departamentos - ${unidade.nome}*\n\n`;
    
    if (departamentos && departamentos.length > 0) {
        departamentos.forEach((depto, index) => {
            mensagem += `${index + 1}️⃣ - ${depto.nome}\n`;
        });
    } else {
        mensagem += '1️⃣ - Administrativo\n';
        mensagem += '2️⃣ - Vendas\n';
        mensagem += '3️⃣ - Agendamento\n';
        mensagem += '4️⃣ - Financeiro\n';
    }
    
    mensagem += '0️⃣ - Voltar\n\n';
    mensagem += 'Digite o número do departamento desejado.';
    return mensagem;
}


// Gerar menu de profissionais
function gerarMenuProfissionais(unidade, profissionais) {
    let mensagem = `????? *Profissionais - ${unidade.nome}*\n\n`;

    if (profissionais && profissionais.length > 0) {
        profissionais.forEach((profissional, index) => {
            mensagem += `${index + 1}?? - ${profissional.nome}\n`;
        });
        mensagem += '0?? - Voltar\n\n';
        mensagem += 'Digite o numero do profissional para solicitar atendimento.';
    } else {
        mensagem += '? Nenhum profissional disponivel no momento.\n';
        mensagem += 'Por favor, tente novamente mais tarde.\n\n';
        mensagem += 'Digite *0* para voltar.';
    }

    return mensagem;
} 

// Gerar menu de vendedores
function gerarMenuVendedores(unidade, vendedores) {
    let mensagem = `💼 *Equipe de Vendas - ${unidade.nome}*\n\n`;
    
    if (vendedores && vendedores.length > 0) {
        vendedores.forEach((vendedor, index) => {
            mensagem += `${index + 1}️⃣ - ${vendedor.nome}\n`;
        });
        mensagem += '0️⃣ - Voltar\n\n';
        mensagem += 'Digite o número do vendedor para ser transferido.';
    } else {
        mensagem += '❌ Nenhum vendedor disponível no momento.\n';
        mensagem += 'Por favor, tente novamente mais tarde.\n\n';
        mensagem += 'Digite *0* para voltar.';
    }
    
    return mensagem;
}

// Gerar mensagem de transferência para vendedor
function gerarMensagemTransferencia(vendedor) {
    let mensagem = `✅ *Transferindo para ${vendedor.nome}*\n\n`;
    mensagem += `📱 Número: ${vendedor.numero}\n\n`;
    mensagem += `_Sua conversa foi registrada em nosso sistema._\n`;
    mensagem += `_O vendedor entrará em contato em breve._\n\n`;
    mensagem += `💡 Você também pode entrar em contato diretamente:\n`;
    mensagem += `https://wa.me/${vendedor.numero}\n\n`;
    mensagem += `Digite *menu* para voltar ao início.`;
    return mensagem;
}

// Registrar interação no banco
function registrarInteracao(userId, tipo, dados) {
    const query = 'INSERT INTO interacoes (user_id, tipo, dados, data_hora) VALUES (?, ?, ?, datetime("now", "localtime"))';
    db.run(query, [userId, tipo, JSON.stringify(dados)], (err) => {
        if (err) console.error('Erro ao registrar interação:', err);
    });
}


// Helpers simples para queries async
function dbAll(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });
}

function dbGet(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) return reject(err);
            resolve(row);
        });
    });
}

function dbRun(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) return reject(err);
            resolve(this);
        });
    });
}

// Registrar mensagem recebida
async function registrarMensagemRecebida(userId, mensagem) {
    registrarInteracao(userId, 'mensagem_recebida', { mensagem });
    await iniciarConversaSeNecessario(userId);
    await atualizarUltimaMensagemConversa(userId);
    await atualizarFilaUltimaMensagem(userId);
}

function registrarMensagemEnviada(userId, mensagem, contexto) {
    const dados = { mensagem };
    if (contexto) {
        dados.contexto = contexto;
    }
    registrarInteracao(userId, 'mensagem_enviada', dados);
}

// Iniciar conversa se nao existir ativa
async function iniciarConversaSeNecessario(userId) {
    const row = await dbGet(
        'SELECT id, status FROM conversas WHERE user_id = ? ORDER BY id DESC LIMIT 1',
        [userId]
    );

    if (!row || ['finalizada', 'abandonada'].includes(row.status)) {
        await dbRun(
            'INSERT INTO conversas (user_id, status, started_at, updated_at, last_message_at) VALUES (?, ?, datetime("now", "localtime"), datetime("now", "localtime"), datetime("now", "localtime"))',
            [userId, 'iniciada']
        );
        registrarInteracao(userId, 'conversa_iniciada', {});
    }
}

async function atualizarUltimaMensagemConversa(userId) {
    await dbRun(
        'UPDATE conversas SET last_message_at = datetime("now", "localtime"), updated_at = datetime("now", "localtime") WHERE id = (SELECT id FROM conversas WHERE user_id = ? ORDER BY id DESC LIMIT 1)',
        [userId]
    );
}

async function atualizarStatusConversa(userId, status, unidadeId, departamentoId) {
    await dbRun(
        'UPDATE conversas SET status = ?, unidade_id = COALESCE(?, unidade_id), departamento_id = COALESCE(?, departamento_id), updated_at = datetime("now", "localtime") WHERE id = (SELECT id FROM conversas WHERE user_id = ? ORDER BY id DESC LIMIT 1)',
        [status, unidadeId, departamentoId, userId]
    );
}

// Fila de atendimento
async function obterFilaDepartamento(departamentoId) {
    return dbAll(
        'SELECT * FROM fila_atendimentos WHERE departamento_id = ? AND status IN ("aguardando", "em_atendimento") ORDER BY created_at ASC',
        [departamentoId]
    );
}

async function entrarFilaAtendimento(userId, unidadeId, departamentoId) {
    const existente = await dbGet(
        'SELECT * FROM fila_atendimentos WHERE user_id = ? AND departamento_id = ? AND status IN ("aguardando", "em_atendimento") ORDER BY created_at DESC LIMIT 1',
        [userId, departamentoId]
    );

    if (existente) {
        const fila = await obterFilaDepartamento(departamentoId);
        const aguardando = fila.filter((f) => f.status === 'aguardando');
        const pos = aguardando.findIndex((f) => f.user_id === userId);
        return {
            status: existente.status,
            position: pos >= 0 ? pos + 1 : 0
        };
    }

    const ativo = await dbGet(
        'SELECT id FROM fila_atendimentos WHERE departamento_id = ? AND status = "em_atendimento" ORDER BY created_at ASC LIMIT 1',
        [departamentoId]
    );

    if (!ativo) {
        await dbRun(
            'INSERT INTO fila_atendimentos (user_id, unidade_id, departamento_id, status, created_at, updated_at, last_message_at) VALUES (?, ?, ?, "em_atendimento", datetime("now", "localtime"), datetime("now", "localtime"), datetime("now", "localtime"))',
            [userId, unidadeId, departamentoId]
        );
        await atualizarStatusConversa(userId, 'em_atendimento', unidadeId, departamentoId);
        registrarInteracao(userId, 'atendimento_iniciado', { unidade_id: unidadeId, departamento_id: departamentoId });
        return { status: 'em_atendimento', position: 0 };
    }

    await dbRun(
        'INSERT INTO fila_atendimentos (user_id, unidade_id, departamento_id, status, created_at, updated_at, last_message_at) VALUES (?, ?, ?, "aguardando", datetime("now", "localtime"), datetime("now", "localtime"), datetime("now", "localtime"))',
        [userId, unidadeId, departamentoId]
    );

    const countRow = await dbGet(
        'SELECT COUNT(*) as total FROM fila_atendimentos WHERE departamento_id = ? AND status = "aguardando"',
        [departamentoId]
    );

    await atualizarStatusConversa(userId, 'aguardando_atendimento', unidadeId, departamentoId);
    registrarInteracao(userId, 'fila_entrada', { unidade_id: unidadeId, departamento_id: departamentoId, posicao: countRow.total });
    return { status: 'aguardando', position: countRow.total };
}

async function atualizarFilaUltimaMensagem(userId) {
    await dbRun(
        'UPDATE fila_atendimentos SET last_message_at = datetime("now", "localtime"), updated_at = datetime("now", "localtime") WHERE user_id = ? AND status IN ("aguardando", "em_atendimento")',
        [userId]
    );
}

async function marcarFilaAbandonada(userId, motivo) {
    const row = await dbGet(
        'SELECT id, unidade_id, departamento_id FROM fila_atendimentos WHERE user_id = ? AND status = "aguardando" ORDER BY created_at DESC LIMIT 1',
        [userId]
    );

    if (!row) return false;

    await dbRun(
        'UPDATE fila_atendimentos SET status = "abandonado", updated_at = datetime("now", "localtime") WHERE id = ?',
        [row.id]
    );

    await atualizarStatusConversa(userId, 'abandonada', row.unidade_id, row.departamento_id);
    registrarInteracao(userId, 'fila_abandonada', { unidade_id: row.unidade_id, departamento_id: row.departamento_id, motivo: motivo || 'menu' });
    return true;
}


async function processarFila(client, options = {}) {
    const intervaloAvisoMs = (options.intervaloAvisoSeg || 30) * 1000;
    const timeoutAbandonoMs = (options.timeoutAbandonoSeg || 1200) * 1000;
    const agora = Date.now();

    const finalizados = await dbAll(
        'SELECT * FROM fila_atendimentos WHERE status = "finalizado"'
    );

    for (const f of finalizados) {
        const precisaAviso = !f.last_notified_at || new Date(f.last_notified_at).getTime() < new Date(f.updated_at).getTime();
        if (precisaAviso) {
            await client.sendText(f.user_id, 'Seu atendimento foi finalizado. Se precisar de algo, digite *menu*.');
            registrarMensagemEnviada(f.user_id, 'Seu atendimento foi finalizado. Se precisar de algo, digite *menu*.', {
                tipo: 'fila_finalizada'
            });
            await dbRun(
                'UPDATE fila_atendimentos SET status = "encerrado", last_notified_at = datetime("now", "localtime"), updated_at = datetime("now", "localtime") WHERE id = ?',
                [f.id]
            );
            await atualizarStatusConversa(f.user_id, 'finalizada', f.unidade_id, f.departamento_id);
            registrarInteracao(f.user_id, 'atendimento_finalizado', { unidade_id: f.unidade_id, departamento_id: f.departamento_id });
        }
    }

    const departamentos = await dbAll(
        'SELECT DISTINCT departamento_id FROM fila_atendimentos WHERE status IN ("aguardando", "em_atendimento")'
    );

    for (const d of departamentos) {
        const deptoId = d.departamento_id;
        const ativo = await dbGet(
            'SELECT * FROM fila_atendimentos WHERE departamento_id = ? AND status = "em_atendimento" ORDER BY created_at ASC LIMIT 1',
            [deptoId]
        );

        let aguardando = await dbAll(
            'SELECT * FROM fila_atendimentos WHERE departamento_id = ? AND status = "aguardando" ORDER BY created_at ASC',
            [deptoId]
        );

        // Promover proximo se nao ha ativo
        if (!ativo && aguardando.length > 0) {
            const proximo = aguardando[0];
            await dbRun(
                'UPDATE fila_atendimentos SET status = "em_atendimento", updated_at = datetime("now", "localtime") WHERE id = ?',
                [proximo.id]
            );
            await atualizarStatusConversa(proximo.user_id, 'em_atendimento', proximo.unidade_id, proximo.departamento_id);
            registrarInteracao(proximo.user_id, 'atendimento_iniciado', { unidade_id: proximo.unidade_id, departamento_id: proximo.departamento_id });
            await client.sendText(proximo.user_id, 'Agora e a sua vez! Um atendente vai falar com voce em seguida.');
            registrarMensagemEnviada(proximo.user_id, 'Agora e a sua vez! Um atendente vai falar com voce em seguida.', {
                tipo: 'fila_promocao'
            });
            aguardando = aguardando.slice(1);
        }

        // Abandono por inatividade
        const ativosAguardando = [];
        for (const filaItem of aguardando) {
            const baseTime = filaItem.last_message_at || filaItem.created_at;
            if (timeoutAbandonoMs > 0 && baseTime) {
                const lastTime = new Date(baseTime).getTime();
                if (!Number.isNaN(lastTime) && agora - lastTime > timeoutAbandonoMs) {
                    await dbRun(
                        'UPDATE fila_atendimentos SET status = "abandonado", updated_at = datetime("now", "localtime") WHERE id = ?',
                        [filaItem.id]
                    );
                    await atualizarStatusConversa(filaItem.user_id, 'abandonada', filaItem.unidade_id, filaItem.departamento_id);
                    registrarInteracao(filaItem.user_id, 'fila_abandonada', { unidade_id: filaItem.unidade_id, departamento_id: filaItem.departamento_id, motivo: 'timeout' });
                    await client.sendText(filaItem.user_id, 'Sua fila expirou por inatividade. Digite *menu* para voltar.');
                    registrarMensagemEnviada(filaItem.user_id, 'Sua fila expirou por inatividade. Digite *menu* para voltar.', {
                        tipo: 'fila_timeout'
                    });
                    continue;
                }
            }
            ativosAguardando.push(filaItem)
        }

        // Avisos periodicos de posicao
        for (let i = 0; i < ativosAguardando.length; i++) {
            const filaItem = ativosAguardando[i];
            const lastNotified = filaItem.last_notified_at ? new Date(filaItem.last_notified_at).getTime() : 0;
            if (!lastNotified || agora - lastNotified >= intervaloAvisoMs) {
                const posicao = i + 1;
                await client.sendText(filaItem.user_id, `Voce esta na fila do atendimento. Sua posicao atual e ${posicao}.`);
                registrarMensagemEnviada(filaItem.user_id, `Voce esta na fila do atendimento. Sua posicao atual e ${posicao}.`, {
                    tipo: 'fila_aviso',
                    posicao
                });
                await dbRun(
                    'UPDATE fila_atendimentos SET last_notified_at = datetime("now", "localtime") WHERE id = ?',
                    [filaItem.id]
                );
            }
        }
    }
}


// Obter uma configuração específica
function obterConfiguracao(chave) {
    return new Promise((resolve, reject) => {
        db.get('SELECT valor FROM configuracoes WHERE chave = ?', [chave], (err, row) => {
            if (err) return reject(err);
            resolve(row ? row.valor : null);
        });
    });
}

// Atualizar uma configuração
function atualizarConfiguracao(chave, valor) {
    return new Promise((resolve, reject) => {
        db.run(
            'UPDATE configuracoes SET valor = ?, updated_at = CURRENT_TIMESTAMP WHERE chave = ?',
            [valor, chave],
            (err) => {
                if (err) return reject(err);
                resolve();
            }
        );
    });
}

module.exports = {
    inicializarBanco,
    carregarConfiguracoes,
    gerarMenuUnidades,
    gerarMenuUnidade,
    gerarMensagemEndereco,
    gerarMensagemValores,
    gerarMenuDepartamentos,
    gerarMenuVendedores,
    gerarMensagemTransferencia,
    registrarInteracao,
    registrarMensagemRecebida,
    registrarMensagemEnviada,
    iniciarConversaSeNecessario,
    atualizarUltimaMensagemConversa,
    atualizarStatusConversa,
    obterFilaDepartamento,
    entrarFilaAtendimento,
    atualizarFilaUltimaMensagem,
    marcarFilaAbandonada,
    processarFila,
    obterConfiguracao,
    atualizarConfiguracao
};
