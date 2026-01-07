const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database');
const { spawn } = require('child_process');

function dbAllAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function dbGetAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function dbRunAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
}


const app = express();
const PORT = 3000;

// Gerenciamento do processo do bot
let botProcess = null;
let botStatus = 'parado'; // 'parado', 'iniciando', 'rodando', 'erro'
let botLogs = [];
let qrCodeData = null; // Armazenar QR Code

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Helper para reiniciar bot após alterações
function agendarReinicioBot() {
  if (botProcess) {
    setTimeout(() => {
      console.log('🔄 Reiniciando bot após alterações...');
      reiniciarBot();
    }, 2000); // 2 segundos antes de reiniciar
  }
}

// ==================== ROTAS - UNIDADES ====================
app.get('/api/unidades', (req, res) => {
  db.all('SELECT * FROM unidades ORDER BY id', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/unidades/:id', (req, res) => {
  db.get('SELECT * FROM unidades WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row);
  });
});

app.post('/api/unidades', (req, res) => {
  const { nome, descricao, endereco, ativa } = req.body;
  db.run(
    'INSERT INTO unidades (nome, descricao, endereco, ativa) VALUES (?, ?, ?, ?)',
    [nome, descricao, endereco, ativa || 1],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      agendarReinicioBot();
      res.json({ id: this.lastID, message: 'Unidade criada com sucesso' });
    }
  );
});

app.put('/api/unidades/:id', (req, res) => {
  const { nome, descricao, endereco, ativa } = req.body;
  db.run(
    'UPDATE unidades SET nome = ?, descricao = ?, endereco = ?, ativa = ? WHERE id = ?',
    [nome, descricao, endereco, ativa, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      agendarReinicioBot();
      res.json({ message: 'Unidade atualizada com sucesso' });
    }
  );
});

app.delete('/api/unidades/:id', (req, res) => {
  db.run('DELETE FROM unidades WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    agendarReinicioBot();
    res.json({ message: 'Unidade removida com sucesso' });
  });
});

// ==================== ROTAS - VENDEDORES ====================
app.get('/api/vendedores', (req, res) => {
  const query = `
    SELECT v.*, u.nome as unidade_nome 
    FROM vendedores v 
    LEFT JOIN unidades u ON v.unidade_id = u.id 
    ORDER BY v.ordem
  `;
  db.all(query, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/vendedores/:id', (req, res) => {
  db.get('SELECT * FROM vendedores WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row);
  });
});

app.get('/api/vendedores/unidade/:unidadeId', (req, res) => {
  db.all(
    'SELECT * FROM vendedores WHERE unidade_id = ? AND ativo = 1 ORDER BY ordem',
    [req.params.unidadeId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

app.post('/api/vendedores', (req, res) => {
  const { nome, numero, unidade_id, ativo, ordem } = req.body;
  db.run(
    'INSERT INTO vendedores (nome, numero, unidade_id, ativo, ordem) VALUES (?, ?, ?, ?, ?)',
    [nome, numero, unidade_id, ativo || 1, ordem || 1],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      agendarReinicioBot();
      res.json({ id: this.lastID, message: 'Vendedor criado com sucesso' });
    }
  );
});

app.put('/api/vendedores/:id', (req, res) => {
  const { nome, numero, unidade_id, ativo, ordem } = req.body;
  db.run(
    'UPDATE vendedores SET nome = ?, numero = ?, unidade_id = ?, ativo = ?, ordem = ? WHERE id = ?',
    [nome, numero, unidade_id, ativo, ordem || 1, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      agendarReinicioBot();
      res.json({ message: 'Vendedor atualizado com sucesso' });
    }
  );
});

app.delete('/api/vendedores/:id', (req, res) => {
  db.run('DELETE FROM vendedores WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    agendarReinicioBot();
    res.json({ message: 'Vendedor removido com sucesso' });
  });
});

// ==================== ROTAS - VALORES/SERVIÇOS ====================
app.get('/api/valores', (req, res) => {
  const query = `
    SELECT v.*, u.nome as unidade_nome 
    FROM valores v 
    LEFT JOIN unidades u ON v.unidade_id = u.id 
    ORDER BY v.unidade_id, v.ordem
  `;
  db.all(query, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/valores/:id', (req, res) => {
  db.get('SELECT * FROM valores WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row);
  });
});

app.post('/api/valores', (req, res) => {
  const { servico, preco, unidade_id, ordem } = req.body;
  db.run(
    'INSERT INTO valores (servico, preco, unidade_id, ordem) VALUES (?, ?, ?, ?)',
    [servico, preco, unidade_id, ordem || 1],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      agendarReinicioBot();
      res.json({ id: this.lastID, message: 'Valor criado com sucesso' });
    }
  );
});

app.put('/api/valores/:id', (req, res) => {
  const { servico, preco, unidade_id, ordem } = req.body;
  db.run(
    'UPDATE valores SET servico = ?, preco = ?, unidade_id = ?, ordem = ? WHERE id = ?',
    [servico, preco, unidade_id, ordem || 1, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      agendarReinicioBot();
      res.json({ message: 'Valor atualizado com sucesso' });
    }
  );
});

app.delete('/api/valores/:id', (req, res) => {
  db.run('DELETE FROM valores WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    agendarReinicioBot();
    res.json({ message: 'Valor removido com sucesso' });
  });
});

// ==================== ROTAS - DEPARTAMENTOS ====================
app.get('/api/departamentos', (req, res) => {
  const query = `
    SELECT d.*, u.nome as unidade_nome 
    FROM departamentos d 
    LEFT JOIN unidades u ON d.unidade_id = u.id
  `;
  db.all(query, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/departamentos/:id', (req, res) => {
  db.get('SELECT * FROM departamentos WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row);
  });
});

app.post('/api/departamentos', (req, res) => {
  const { unidade_id, nome, mensagem } = req.body;
  db.run(
    'INSERT INTO departamentos (unidade_id, nome, mensagem) VALUES (?, ?, ?)',
    [unidade_id, nome, mensagem],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      agendarReinicioBot();
      res.json({ id: this.lastID, message: 'Departamento criado com sucesso' });
    }
  );
});

app.put('/api/departamentos/:id', (req, res) => {
  const { unidade_id, nome, mensagem } = req.body;
  db.run(
    'UPDATE departamentos SET unidade_id = ?, nome = ?, mensagem = ? WHERE id = ?',
    [unidade_id, nome, mensagem, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      agendarReinicioBot();
      res.json({ message: 'Departamento atualizado com sucesso' });
    }
  );
});

app.delete('/api/departamentos/:id', (req, res) => {
  db.run('DELETE FROM departamentos WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    agendarReinicioBot();
    res.json({ message: 'Departamento removido com sucesso' });
  });
});

// ==================== ROTAS - ENDEREÇOS ====================
app.get('/api/enderecos', (req, res) => {
  const query = `
    SELECT e.*, u.nome as unidade_nome 
    FROM enderecos e 
    LEFT JOIN unidades u ON e.unidade_id = u.id
  `;
  db.all(query, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.put('/api/enderecos/:id', (req, res) => {
  const { rua, numero, complemento, bairro, cidade, estado, cep } = req.body;
  db.run(
    'UPDATE enderecos SET rua = ?, numero = ?, complemento = ?, bairro = ?, cidade = ?, estado = ?, cep = ? WHERE id = ?',
    [rua, numero, complemento, bairro, cidade, estado, cep, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Endereço atualizado com sucesso' });
    }
  );
});

// ==================== ROTAS - CONFIGURAÇÕES ====================
app.get('/api/configuracoes', (req, res) => {
  db.all('SELECT * FROM configuracoes', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.put('/api/configuracoes/:id', (req, res) => {
  const { valor } = req.body;
  db.run(
    'UPDATE configuracoes SET valor = ? WHERE id = ?',
    [valor, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Configuração atualizada com sucesso' });
    }
  );
});

// ==================== ROTAS - LOGS ====================
app.get('/api/logs', (req, res) => {
  db.all(
    'SELECT * FROM logs_conversas ORDER BY data_hora DESC LIMIT 100',
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

app.post('/api/logs', (req, res) => {
  const { usuario_id, mensagem, resposta, menu_atual } = req.body;
  db.run(
    'INSERT INTO logs_conversas (usuario_id, mensagem, resposta, menu_atual) VALUES (?, ?, ?, ?)',
    [usuario_id, mensagem, resposta, menu_atual],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});



// ==================== ROTAS - ANALYTICS ====================
app.get('/api/analytics/summary', async (req, res) => {
  try {
    const range = Math.max(1, Math.min(parseInt(req.query.range || '30', 10), 365));
    const rangeExpr = `-${range} days`;

    const mensagens = await dbAllAsync(
      "SELECT date(data_hora) as dia, COUNT(*) as total FROM interacoes WHERE tipo = 'mensagem_recebida' AND data_hora >= datetime('now', ?) GROUP BY dia ORDER BY dia",
      [rangeExpr]
    );

    const conversas = await dbAllAsync(
      "SELECT date(data_hora) as dia, COUNT(*) as total FROM interacoes WHERE tipo = 'conversa_iniciada' AND data_hora >= datetime('now', ?) GROUP BY dia ORDER BY dia",
      [rangeExpr]
    );

    const abandonos = await dbAllAsync(
      "SELECT date(data_hora) as dia, COUNT(*) as total FROM interacoes WHERE tipo IN ('fila_abandonada', 'conversa_abandonada') AND data_hora >= datetime('now', ?) GROUP BY dia ORDER BY dia",
      [rangeExpr]
    );

    const totalMensagens = await dbGetAsync(
      "SELECT COUNT(*) as total FROM interacoes WHERE tipo = 'mensagem_recebida' AND data_hora >= datetime('now', ?)",
      [rangeExpr]
    );

    const totalConversas = await dbGetAsync(
      "SELECT COUNT(*) as total FROM interacoes WHERE tipo = 'conversa_iniciada' AND data_hora >= datetime('now', ?)",
      [rangeExpr]
    );

    const totalAbandonos = await dbGetAsync(
      "SELECT COUNT(*) as total FROM interacoes WHERE tipo IN ('fila_abandonada', 'conversa_abandonada') AND data_hora >= datetime('now', ?)",
      [rangeExpr]
    );

    const totalAtendimentos = await dbGetAsync(
      "SELECT COUNT(*) as total FROM interacoes WHERE tipo = 'atendimento_iniciado' AND data_hora >= datetime('now', ?)",
      [rangeExpr]
    );

    const assuntosRows = await dbAllAsync(
      "SELECT dados FROM interacoes WHERE tipo = 'contato_departamento' AND data_hora >= datetime('now', ?)",
      [rangeExpr]
    );

    const assuntosMap = {};
    assuntosRows.forEach((row) => {
      try {
        const dados = JSON.parse(row.dados || '{}');
        const assunto = dados.departamento || 'Nao informado';
        assuntosMap[assunto] = (assuntosMap[assunto] || 0) + 1;
      } catch (err) {
        // ignore
      }
    });

    const topAssuntos = Object.entries(assuntosMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([assunto, total]) => ({ assunto, total }));

    const topNumeros = await dbAllAsync(
      "SELECT user_id as numero, COUNT(*) as total FROM interacoes WHERE tipo = 'mensagem_recebida' AND data_hora >= datetime('now', ?) GROUP BY user_id ORDER BY total DESC LIMIT 10",
      [rangeExpr]
    );

    res.json({
      range,
      totals: {
        mensagens: totalMensagens ? totalMensagens.total : 0,
        conversas: totalConversas ? totalConversas.total : 0,
        abandonos: totalAbandonos ? totalAbandonos.total : 0,
        atendimentos: totalAtendimentos ? totalAtendimentos.total : 0
      },
      series: {
        mensagens,
        conversas,
        abandonos
      },
      topAssuntos,
      topNumeros
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== ROTAS - FILA DE ATENDIMENTO ====================
app.get('/api/fila/resumo', async (req, res) => {
  try {
    const rows = await dbAllAsync(
      `
      SELECT f.*, d.nome as departamento_nome, u.nome as unidade_nome
      FROM fila_atendimentos f
      LEFT JOIN departamentos d ON f.departamento_id = d.id
      LEFT JOIN unidades u ON f.unidade_id = u.id
      WHERE f.status IN ('aguardando', 'em_atendimento')
      ORDER BY f.departamento_id, f.created_at
      `
    );

    const resumo = {};
    rows.forEach((row) => {
      const key = row.departamento_id;
      if (!resumo[key]) {
        resumo[key] = {
          departamento_id: row.departamento_id,
          departamento_nome: row.departamento_nome || 'Departamento',
          unidade_nome: row.unidade_nome || 'Unidade',
          ativo: null,
          aguardando: []
        };
      }
      if (row.status === 'em_atendimento') {
        resumo[key].ativo = row;
      } else {
        resumo[key].aguardando.push(row);
      }
    });

    res.json(Object.values(resumo));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/fila/encerrar', async (req, res) => {
  try {
    const { departamento_id } = req.body;
    if (!departamento_id) {
      return res.status(400).json({ error: 'departamento_id obrigatorio' });
    }

    const ativo = await dbGetAsync(
      'SELECT id FROM fila_atendimentos WHERE departamento_id = ? AND status = "em_atendimento" ORDER BY created_at ASC LIMIT 1',
      [departamento_id]
    );

    if (!ativo) {
      return res.status(404).json({ error: 'Nenhum atendimento ativo' });
    }

    await dbRunAsync(
      'UPDATE fila_atendimentos SET status = "finalizado", updated_at = datetime("now", "localtime") WHERE id = ?',
      [ativo.id]
    );

    res.json({ message: 'Atendimento encerrado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// ==================== ROTAS - CONVERSAS ====================
app.get('/api/conversas', async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(parseInt(req.query.limit || '50', 10), 500));
    const rows = await dbAllAsync(
      `
      SELECT
        c.user_id,
        c.status,
        c.updated_at,
        (
          SELECT i.tipo
          FROM interacoes i
          WHERE i.user_id = c.user_id AND i.tipo IN ('mensagem_recebida', 'mensagem_enviada')
          ORDER BY i.data_hora DESC
          LIMIT 1
        ) as ultimo_tipo,
        (
          SELECT i.dados
          FROM interacoes i
          WHERE i.user_id = c.user_id AND i.tipo IN ('mensagem_recebida', 'mensagem_enviada')
          ORDER BY i.data_hora DESC
          LIMIT 1
        ) as ultimo_dados,
        (
          SELECT i.data_hora
          FROM interacoes i
          WHERE i.user_id = c.user_id AND i.tipo IN ('mensagem_recebida', 'mensagem_enviada')
          ORDER BY i.data_hora DESC
          LIMIT 1
        ) as ultimo_hora
      FROM conversas c
      ORDER BY c.updated_at DESC
      LIMIT ?
      `,
      [limit]
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/conversas/:userId', async (req, res) => {
  try {
    const rows = await dbAllAsync(
      `
      SELECT tipo, dados, data_hora
      FROM interacoes
      WHERE user_id = ? AND tipo IN ('mensagem_recebida', 'mensagem_enviada')
      ORDER BY data_hora ASC
      `,
      [req.params.userId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== CONTROLE DO BOT ====================
// Função para iniciar o bot
function iniciarBot() {
  if (botProcess) {
    return { success: false, message: 'Bot já está rodando' };
  }

  botStatus = 'iniciando';
  botLogs = ['🚀 Iniciando bot...'];

  botProcess = spawn('node', ['index-dinamico.js'], {
    cwd: path.join(__dirname, '..'),
    shell: true
  });

  botProcess.stdout.on('data', (data) => {
    const log = data.toString();
    botLogs.push(log);
    if (botLogs.length > 100) botLogs.shift(); // Manter apenas últimas 100 linhas
    
    // Capturar QR Code (procurar por base64 do QR)
    const qrMatch = log.match(/QR_CODE_BASE64:(.+)/);
    if (qrMatch) {
      qrCodeData = qrMatch[1].trim();
      console.log('📱 QR Code capturado para o painel');
    }
    
    // Limpar QR Code quando conectar
    if (log.includes('Bot iniciado com sucesso') || log.includes('Conectado')) {
      botStatus = 'rodando';
      qrCodeData = null; // Limpar QR após conectar
    }
  });

  botProcess.stderr.on('data', (data) => {
    const log = `❌ ${data.toString()}`;
    botLogs.push(log);
    if (botLogs.length > 100) botLogs.shift();
  });

  botProcess.on('close', (code) => {
    botLogs.push(`Bot finalizado com código ${code}`);
    botStatus = code === 0 ? 'parado' : 'erro';
    botProcess = null;
  });

  return { success: true, message: 'Bot iniciado com sucesso' };
}

// Função para parar o bot
function pararBot() {
  if (!botProcess) {
    return { success: false, message: 'Bot não está rodando' };
  }

  try {
    // No Windows, usar taskkill para matar o processo e seus filhos (Chrome/Puppeteer)
    const { execSync } = require('child_process');
    execSync(`taskkill /pid ${botProcess.pid} /T /F`, { stdio: 'ignore' });
  } catch (error) {
    // Se taskkill falhar, tenta kill normal
    botProcess.kill('SIGKILL');
  }

  botProcess = null;
  botStatus = 'parado';
  botLogs.push('🛑 Bot parado pelo painel');

  return { success: true, message: 'Bot parado com sucesso' };
}

// Função para reiniciar o bot
function reiniciarBot() {
  if (botProcess) {
    pararBot();
    setTimeout(() => {
      iniciarBot();
    }, 3000); // 3 segundos para garantir que Chrome fechou
  } else {
    iniciarBot();
  }
  return { success: true, message: 'Bot reiniciando...' };
}

// Rotas de controle do bot
app.get('/api/bot/status', (req, res) => {
  res.json({
    status: botStatus,
    rodando: botProcess !== null,
    logs: botLogs.slice(-50), // Últimas 50 linhas
    qrCode: qrCodeData // Adicionar QR Code ao status
  });
});

app.post('/api/bot/iniciar', (req, res) => {
  const result = iniciarBot();
  res.json(result);
});

app.post('/api/bot/parar', (req, res) => {
  const result = pararBot();
  res.json(result);
});

app.post('/api/bot/reiniciar', (req, res) => {
  const result = reiniciarBot();
  res.json(result);
});

// ==================== ROTAS - CONFIGURAÇÕES ====================
app.get('/api/configuracoes', (req, res) => {
  db.all('SELECT * FROM configuracoes ORDER BY chave', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/configuracoes/:chave', (req, res) => {
  db.get('SELECT * FROM configuracoes WHERE chave = ?', [req.params.chave], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row);
  });
});

app.put('/api/configuracoes/:chave', (req, res) => {
  const { valor } = req.body;
  console.log(`📝 Atualizando configuração: ${req.params.chave}`);
  console.log(`   Novo valor: ${valor.substring(0, 50)}...`);
  
  db.run(
    'UPDATE configuracoes SET valor = ?, updated_at = CURRENT_TIMESTAMP WHERE chave = ?',
    [valor, req.params.chave],
    function(err) {
      if (err) {
        console.error('❌ Erro ao atualizar:', err.message);
        return res.status(500).json({ error: err.message });
      }
      console.log(`✅ Atualizado! Linhas afetadas: ${this.changes}`);
      agendarReinicioBot();
      res.json({ message: 'Configuração atualizada com sucesso' });
    }
  );
});

// Rota principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  console.log(`📊 Painel administrativo disponível em http://localhost:${PORT}`);
  console.log(`\n💡 Use o painel para controlar o bot!`);
});

module.exports = app;
