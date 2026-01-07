const wppconnect = require('@wppconnect-team/wppconnect');
const botIntegration = require('./bot-integration');

// Configurações do bot
const sessionName = 'bot-clinica';

// Armazenar estado de conversação de cada usuário
const userStates = {};

// Cache de configurações
let config = null;

// Recarregar configurações do banco
async function recarregarConfiguracoes() {
  try {
    config = await botIntegration.carregarConfiguracoes();
    console.log('✅ Configurações carregadas do banco de dados');
    console.log(`   - Unidades: ${config.unidades.length}`);
    console.log(`   - Departamentos: ${Object.keys(config.departamentos).length} unidades`);
    console.log(`   - Vendedores: ${Object.keys(config.vendedores).length} unidades`);
    return config;
  } catch (error) {
    console.error('❌ Erro ao carregar configurações:', error);
    throw error;
  }
}

// Criar e iniciar o cliente
recarregarConfiguracoes().then(() => {
  wppconnect
    .create({
      session: sessionName,
      catchQR: (base64Qrimg, asciiQR, attempts, urlCode) => {
        console.log('Terminal QR Code:');
        console.log(asciiQR);
        console.log('Número de tentativas:', attempts);
        console.log('QR Code URL:', urlCode);
      },
      statusFind: (statusSession, session) => {
        console.log('Status da sessão:', statusSession);
        console.log('Sessão:', session);
      },
      headless: 'new',
      devtools: false,
      useChrome: true,
      debug: false,
      logQR: true,
      browserArgs: ['--disable-web-security', '--no-sandbox', '--disable-setuid-sandbox'],
      disableWelcome: true,
      updatesLog: true,
      autoClose: 60000,
      tokenStore: 'file',
    })
    .then((client) => start(client))
    .catch((error) => {
      console.error('Erro ao criar sessão:', error);
    });
});

// Função principal do bot
function start(client) {
  console.log('✅ Bot iniciado com sucesso!');

  // Escutar mensagens recebidas
  client.onMessage(async (message) => {
    try {
      // Ignorar mensagens de grupo e mensagens sem texto
      if (message.isGroupMsg === false && message.body) {
        console.log('Mensagem recebida de:', message.from);
        console.log('Conteúdo:', message.body);

        const userId = message.from;
        const userMessage = message.body.trim();
        const userInput = userMessage.toLowerCase();

        // Inicializar estado do usuário se não existir
        if (!userStates[userId]) {
          userStates[userId] = { menu: 'inicial', primeiraMsg: true };
        }

        const state = userStates[userId];

        // === PRIMEIRA MENSAGEM - MOSTRAR MENU AUTOMATICAMENTE ===
        if (state.primeiraMsg) {
          state.primeiraMsg = false;
          state.menu = 'inicial';
          
          // Montar menu com unidades do banco
          let mensagem = '🏥 *Bem-vindo à Clínica Atividade!*\n\n' +
                        'Somos uma multiclínica com duas unidades especializadas:\n\n';
          
          cacheUnidades.forEach((unidade, index) => {
            mensagem += `${index + 1}️⃣ - *${unidade.nome}*\n`;
            if (unidade.descricao) {
              mensagem += `     (${unidade.descricao})\n\n`;
            } else {
              mensagem += '\n';
            }
          });
          
          mensagem += 'Digite o número da opção desejada.';
          
          await client.sendText(userId, mensagem);
          
          // Salvar log
          await botDB.salvarLog(userId, userMessage, mensagem, 'inicial');
          return;
        }

        // === MENU INICIAL ===
        if (userInput === 'menu' || userInput === 'inicio') {
          state.menu = 'inicial';
          
          // Montar menu com unidades do banco
          let mensagem = '🏥 *Bem-vindo à Clínica Atividade!*\n\n' +
                        'Somos uma multiclínica com duas unidades especializadas:\n\n';
          
          cacheUnidades.forEach((unidade, index) => {
            mensagem += `${index + 1}️⃣ - *${unidade.nome}*\n`;
            if (unidade.descricao) {
              mensagem += `     (${unidade.descricao})\n\n`;
            } else {
              mensagem += '\n';
            }
          });
          
          mensagem += 'Digite o número da opção desejada.';
          
          await client.sendText(userId, mensagem);
          await botDB.salvarLog(userId, userMessage, mensagem, 'inicial');
        }

        // === MENU ATIVIDADE LABORAL ===
        else if (state.menu === 'inicial' && userInput === '1') {
          state.menu = 'atividade-laboral';
          await client.sendText(
            userId,
            '💼 *Atividade Laboral*\n' +
            '_Saúde ocupacional e medicina do trabalho_\n\n' +
            '1️⃣ - Endereço\n' +
            '2️⃣ - Valores\n' +
            '3️⃣ - Falar com Atendente\n' +
            '0️⃣ - Voltar ao menu principal\n\n' +
            'Digite o número da opção desejada.'
          );
        }

        // === MENU CONTRA O TEMPO ===
        else if (state.menu === 'inicial' && userInput === '2') {
          state.menu = 'contra-tempo';
          await client.sendText(
            userId,
            '💪 *Contra o Tempo*\n' +
            '_Academia e exercícios físicos_\n\n' +
            '1️⃣ - Endereço\n' +
            '2️⃣ - Valores\n' +
            '3️⃣ - Falar com Atendente\n' +
            '0️⃣ - Voltar ao menu principal\n\n' +
            'Digite o número da opção desejada.'
          );
        }

        // === ENDEREÇO (AMBAS UNIDADES) ===
        else if ((state.menu === 'atividade-laboral' || state.menu === 'contra-tempo') && userInput === '1') {
          await client.sendText(
            userId,
            '📍 *Nossa Localização*\n\n' +
            '📌 Endereço:\n' +
            'Rua do Cruzeiro\n' +
            'Tatuí/SP\n\n' +
            '_Como chegar:_\n' +
            'Estamos localizados na região central de Tatuí.\n\n' +
            'Digite *0* para voltar ou *menu* para o menu principal.'
          );
        }

        // === VALORES ATIVIDADE LABORAL ===
        else if (state.menu === 'atividade-laboral' && userInput === '2') {
          await client.sendText(
            userId,
            '💰 *Valores - Atividade Laboral*\n\n' +
            '🔹 Exame Admissional: R$ 150,00\n' +
            '🔹 Exame Periódico: R$ 120,00\n' +
            '🔹 Exame Demissional: R$ 100,00\n' +
            '🔹 ASO Completo: R$ 180,00\n' +
            '🔹 PCMSO (por funcionário): R$ 80,00\n' +
            '🔹 Consulta Médica Ocupacional: R$ 200,00\n\n' +
            '💡 _Pacotes empresariais com desconto disponíveis!_\n\n' +
            'Digite *0* para voltar ou *menu* para o menu principal.'
          );
        }

        // === VALORES CONTRA O TEMPO ===
        else if (state.menu === 'contra-tempo' && userInput === '2') {
          await client.sendText(
            userId,
            '💰 *Valores - Contra o Tempo*\n\n' +
            '📅 *Planos Mensais:*\n' +
            '🔹 Básico (3x semana): R$ 120,00\n' +
            '🔹 Intermediário (5x semana): R$ 180,00\n' +
            '🔹 Premium (ilimitado): R$ 250,00\n\n' +
            '🎯 *Pacotes Avulsos:*\n' +
            '🔹 Aula experimental: Grátis\n' +
            '🔹 Personal trainer (hora): R$ 80,00\n' +
            '🔹 Avaliação física: R$ 50,00\n\n' +
            '💡 _Primeira semana grátis para novos alunos!_\n\n' +
            'Digite *0* para voltar ou *menu* para o menu principal.'
          );
        }

        // === FALAR COM ATENDENTE - ATIVIDADE LABORAL ===
        else if (state.menu === 'atividade-laboral' && userInput === '3') {
          state.menu = 'atendente-atividade';
          await client.sendText(
            userId,
            '👥 *Departamentos - Atividade Laboral*\n\n' +
            '1️⃣ - Administrativo\n' +
            '2️⃣ - Vendas\n' +
            '3️⃣ - Agendamento\n' +
            '4️⃣ - Financeiro\n' +
            '0️⃣ - Voltar\n\n' +
            'Digite o número do departamento desejado.'
          );
        }

        // === FALAR COM ATENDENTE - CONTRA O TEMPO ===
        else if (state.menu === 'contra-tempo' && userInput === '3') {
          state.menu = 'atendente-tempo';
          await client.sendText(
            userId,
            '👥 *Departamentos - Contra o Tempo*\n\n' +
            '1️⃣ - Administrativo\n' +
            '2️⃣ - Vendas\n' +
            '3️⃣ - Agendamento\n' +
            '4️⃣ - Financeiro\n' +
            '0️⃣ - Voltar\n\n' +
            'Digite o número do departamento desejado.'
          );
        }

        // === VENDAS ATIVIDADE LABORAL ===
        else if (state.menu === 'atendente-atividade' && userInput === '2') {
          state.menu = 'vendas-atividade';
          let mensagem = '💼 *Equipe de Vendas - Atividade Laboral*\n\n';
          equipeVendas['atividade-laboral'].forEach((vendedor, index) => {
            mensagem += `${index + 1}️⃣ - ${vendedor.nome}\n`;
          });
          mensagem += '0️⃣ - Voltar\n\n';
          mensagem += 'Digite o número do vendedor para ser transferido.';
          
          await client.sendText(userId, mensagem);
        }

        // === VENDAS CONTRA O TEMPO ===
        else if (state.menu === 'atendente-tempo' && userInput === '2') {
          state.menu = 'vendas-tempo';
          let mensagem = '💼 *Equipe de Vendas - Contra o Tempo*\n\n';
          equipeVendas['contra-tempo'].forEach((vendedor, index) => {
            mensagem += `${index + 1}️⃣ - ${vendedor.nome}\n`;
          });
          mensagem += '0️⃣ - Voltar\n\n';
          mensagem += 'Digite o número do vendedor para ser transferido.';
          
          await client.sendText(userId, mensagem);
        }

        // === TRANSFERIR PARA VENDEDOR - ATIVIDADE LABORAL ===
        else if (state.menu === 'vendas-atividade' && ['1', '2', '3'].includes(userInput)) {
          const index = parseInt(userInput) - 1;
          const vendedor = equipeVendas['atividade-laboral'][index];
          
          await client.sendText(
            userId,
            `✅ *Transferindo para ${vendedor.nome}*\n\n` +
            `📱 Número: ${vendedor.numero}\n\n` +
            `_Sua conversa foi registrada em nosso sistema._\n` +
            `_O vendedor entrará em contato em breve._\n\n` +
            `💡 Você também pode entrar em contato diretamente:\n` +
            `https://wa.me/${vendedor.numero}\n\n` +
            `Digite *menu* para voltar ao início.`
          );
          
          console.log(`[REGISTRO] Transferência solicitada: ${userId} -> ${vendedor.nome} (${vendedor.numero})`);
          state.menu = 'inicial';
        }

        // === TRANSFERIR PARA VENDEDOR - CONTRA O TEMPO ===
        else if (state.menu === 'vendas-tempo' && ['1', '2', '3'].includes(userInput)) {
          const index = parseInt(userInput) - 1;
          const vendedor = equipeVendas['contra-tempo'][index];
          
          await client.sendText(
            userId,
            `✅ *Transferindo para ${vendedor.nome}*\n\n` +
            `📱 Número: ${vendedor.numero}\n\n` +
            `_Sua conversa foi registrada em nosso sistema._\n` +
            `_O vendedor entrará em contato em breve._\n\n` +
            `💡 Você também pode entrar em contato diretamente:\n` +
            `https://wa.me/${vendedor.numero}\n\n` +
            `Digite *menu* para voltar ao início.`
          );
          
          console.log(`[REGISTRO] Transferência solicitada: ${userId} -> ${vendedor.nome} (${vendedor.numero})`);
          state.menu = 'inicial';
        }

        // === OUTROS DEPARTAMENTOS (MOCKADO) ===
        else if ((state.menu === 'atendente-atividade' || state.menu === 'atendente-tempo') && ['1', '3', '4'].includes(userInput)) {
          const departamentos = {
            '1': 'Administrativo',
            '3': 'Agendamento',
            '4': 'Financeiro'
          };
          
          await client.sendText(
            userId,
            `📞 *${departamentos[userInput]}*\n\n` +
            `Estamos direcionando sua solicitação.\n` +
            `Um atendente entrará em contato em breve.\n\n` +
            `_Horário de atendimento:_\n` +
            `Segunda a Sexta: 08:00 - 18:00\n` +
            `Sábado: 08:00 - 12:00\n\n` +
            `Digite *menu* para voltar ao início.`
          );
          
          console.log(`[REGISTRO] Solicitação de contato - Departamento: ${departamentos[userInput]} - Usuário: ${userId}`);
        }

        // === VOLTAR AO MENU ANTERIOR ===
        else if (userInput === '0') {
          if (state.menu === 'vendas-atividade' || state.menu === 'atendente-atividade') {
            state.menu = state.menu === 'vendas-atividade' ? 'atendente-atividade' : 'atividade-laboral';
            
            if (state.menu === 'atendente-atividade') {
              await client.sendText(
                userId,
                '👥 *Departamentos - Atividade Laboral*\n\n' +
                '1️⃣ - Administrativo\n' +
                '2️⃣ - Vendas\n' +
                '3️⃣ - Agendamento\n' +
                '4️⃣ - Financeiro\n' +
                '0️⃣ - Voltar\n\n' +
                'Digite o número do departamento desejado.'
              );
            } else {
              await client.sendText(
                userId,
                '💼 *Atividade Laboral*\n' +
                '_Saúde ocupacional e medicina do trabalho_\n\n' +
                '1️⃣ - Endereço\n' +
                '2️⃣ - Valores\n' +
                '3️⃣ - Falar com Atendente\n' +
                '0️⃣ - Voltar ao menu principal\n\n' +
                'Digite o número da opção desejada.'
              );
            }
          } else if (state.menu === 'vendas-tempo' || state.menu === 'atendente-tempo') {
            state.menu = state.menu === 'vendas-tempo' ? 'atendente-tempo' : 'contra-tempo';
            
            if (state.menu === 'atendente-tempo') {
              await client.sendText(
                userId,
                '👥 *Departamentos - Contra o Tempo*\n\n' +
                '1️⃣ - Administrativo\n' +
                '2️⃣ - Vendas\n' +
                '3️⃣ - Agendamento\n' +
                '4️⃣ - Financeiro\n' +
                '0️⃣ - Voltar\n\n' +
                'Digite o número do departamento desejado.'
              );
            } else {
              await client.sendText(
                userId,
                '💪 *Contra o Tempo*\n' +
                '_Academia e exercícios físicos_\n\n' +
                '1️⃣ - Endereço\n' +
                '2️⃣ - Valores\n' +
                '3️⃣ - Falar com Atendente\n' +
                '0️⃣ - Voltar ao menu principal\n\n' +
                'Digite o número da opção desejada.'
              );
            }
          } else {
            state.menu = 'inicial';
            await client.sendText(
              userId,
              '🏥 *Bem-vindo à Clínica Atividade!*\n\n' +
              'Somos uma multiclínica com duas unidades especializadas:\n\n' +
              '1️⃣ - *Atividade Laboral*\n' +
              '     (Saúde ocupacional e medicina do trabalho)\n\n' +
              '2️⃣ - *Contra o Tempo*\n' +
              '     (Academia e exercícios físicos)\n\n' +
              'Digite o número da opção desejada.'
            );
          }
        }

        // === PRIMEIRA MENSAGEM / MENSAGEM NÃO RECONHECIDA ===
        else {
          if (state.menu === 'inicial') {
            await client.sendText(
              userId,
              '❓ Opção não reconhecida.\n\n' +
              'Por favor, digite *1* para Atividade Laboral ou *2* para Contra o Tempo.'
            );
          } else {
            await client.sendText(
              userId,
              '❓ Opção inválida.\n\n' +
              'Digite uma opção válida do menu ou *menu* para voltar ao início.'
            );
          }
        }
      }
    } catch (error) {
      console.error('Erro ao processar mensagem:', error);
    }
  });

  // Listener para status de conexão
  client.onStateChange((state) => {
    console.log('Estado da conexão:', state);
    if (state === 'CONFLICT' || state === 'UNLAUNCHED') {
      console.log('Reconectando...');
      client.useHere();
    }
  });
}
