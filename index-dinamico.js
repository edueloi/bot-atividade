const wppconnect = require('@wppconnect-team/wppconnect');
const botIntegration = require('./bot-integration');

// Configurações do bot
const sessionName = 'bot-clinica';

// Armazenar estado de conversação de cada usuário
const userStates = {};

// Cache de configurações
let config = null;
let filaConfig = { intervaloAvisoSeg: 30, timeoutAbandonoSeg: 1200 };

// Recarregar configurações do banco
async function recarregarConfiguracoes() {
  try {
    // Inicializar banco primeiro (criar tabelas se necessário)
    await botIntegration.inicializarBanco();
    
    config = await botIntegration.carregarConfiguracoes();
    const aviso = parseInt(config.config.fila_intervalo_aviso || '30', 10);
    const abandono = parseInt(config.config.fila_timeout_abandono || '1200', 10);
    filaConfig = {
      intervaloAvisoSeg: Number.isNaN(aviso) ? 30 : aviso,
      timeoutAbandonoSeg: Number.isNaN(abandono) ? 1200 : abandono
    };
    console.log('✅ Configurações carregadas do banco de dados');
    console.log(`   - Unidades: ${config.unidades.length}`);
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
        // Enviar QR Code base64 para o servidor capturar
        console.log(`QR_CODE_BASE64:${base64Qrimg}`);
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

  // Recarregar configurações a cada 5 minutos
  setInterval(recarregarConfiguracoes, 5 * 60 * 1000);

  // Processar fila periodicamente (avisos e promocoes)
  setInterval(() => {
    if (!config) return;
    botIntegration.processarFila(client, filaConfig).catch((err) => {
      console.error('Erro ao processar fila:', err);
    });
  }, 10000);

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
        await botIntegration.registrarMensagemRecebida(userId, userMessage);


        // === PRIMEIRA MENSAGEM - MOSTRAR SAUDAÇÃO E MENU ===
        if (state.primeiraMsg) {
          state.primeiraMsg = false;
          state.menu = 'inicial';
          
          // Enviar mensagem de boas-vindas
          const boasVindas = config.config.mensagem_boas_vindas || '👋 Olá! Seja bem-vindo(a)!';
          await client.sendText(userId, boasVindas);
          
          // Aguardar 1 segundo e enviar menu
          setTimeout(async () => {
            const menuPrincipal = config.config.mensagem_menu_principal || '📋 Menu Principal';
            const mensagem = menuPrincipal + '\n\n' + botIntegration.gerarMenuUnidades(config.unidades);
            await client.sendText(userId, mensagem);
          }, 1000);
          
          botIntegration.registrarInteracao(userId, 'primeira_mensagem', { mensagem: userMessage });
          return;
        }

        // === MENU INICIAL - COMANDO ===
        if (userInput === 'menu' || userInput === 'inicio') {
          await botIntegration.marcarFilaAbandonada(userId, 'menu');
          state.menu = 'inicial';
          state.unidadeId = null;
          const menuPrincipal = config.config.mensagem_menu_principal || '📋 Menu Principal';
          const mensagem = menuPrincipal + '\n\n' + botIntegration.gerarMenuUnidades(config.unidades);
          await client.sendText(userId, mensagem);
          return;
        }

        // === ESCOLHA DA UNIDADE ===
        if (state.menu === 'inicial' && /^[1-9]$/.test(userInput)) {
          const index = parseInt(userInput) - 1;
          if (index < config.unidades.length) {
            const unidade = config.unidades[index];
            state.menu = 'unidade';
            state.unidadeId = unidade.id;
            state.unidadeNome = unidade.nome;
            
            const mensagem = botIntegration.gerarMenuUnidade(unidade);
            await client.sendText(userId, mensagem);
            botIntegration.registrarInteracao(userId, 'selecao_unidade', { unidade: unidade.nome });
          } else {
            const msgInvalida = config.config.mensagem_opcao_invalida || '❌ Opção inválida!';
            await client.sendText(userId, msgInvalida);
          }
        }

        // === OPÇÕES DENTRO DA UNIDADE ===
        else if (state.menu === 'unidade') {
          const unidade = config.unidades.find(u => u.id === state.unidadeId);
          
          // Opção 1: Endereço
          if (userInput === '1') {
            const mensagem = botIntegration.gerarMensagemEndereco(unidade);
            await client.sendText(userId, mensagem);
            botIntegration.registrarInteracao(userId, 'consulta_endereco', { unidade: unidade.nome });
          }
          
          // Opção 2: Valores
          else if (userInput === '2') {
            const valores = config.valores[unidade.id] || [];
            const mensagem = botIntegration.gerarMensagemValores(unidade, valores);
            await client.sendText(userId, mensagem);
            botIntegration.registrarInteracao(userId, 'consulta_valores', { unidade: unidade.nome });
          }
          
          // Opção 3: Falar com Atendente
          else if (userInput === '3') {
            state.menu = 'departamentos';
            const departamentos = config.departamentos[unidade.id] || [];
            const mensagem = botIntegration.gerarMenuDepartamentos(unidade, departamentos);
            await client.sendText(userId, mensagem);
          }
          
          // Opção 0: Voltar
          else if (userInput === '0') {
            state.menu = 'inicial';
            state.unidadeId = null;
            const mensagem = botIntegration.gerarMenuUnidades(config.unidades);
            await client.sendText(userId, mensagem);
          }
          
          else {
            await client.sendText(userId, '❓ Opção inválida. Digite um número válido ou *0* para voltar.');
          }
        }

        // === MENU DE DEPARTAMENTOS ===
        else if (state.menu === 'departamentos') {
          const unidade = config.unidades.find(u => u.id === state.unidadeId);
          const departamentos = config.departamentos[unidade.id] || [];
          
          if (userInput === '0') {
            state.menu = 'unidade';
            const mensagem = botIntegration.gerarMenuUnidade(unidade);
            await client.sendText(userId, mensagem);
          }
          else if (/^[1-9]$/.test(userInput)) {
            const index = parseInt(userInput) - 1;
            if (departamentos[index]) {
              const depto = departamentos[index];
              if (depto.nome && depto.nome.toLowerCase() === 'vendas') {
                // Vendas
                state.menu = 'vendedores';
                const vendedores = config.vendedores[unidade.id] || [];
                const mensagem = botIntegration.gerarMenuVendedores(unidade, vendedores);
                await client.sendText(userId, mensagem);
              } else {
                const filaInfo = await botIntegration.entrarFilaAtendimento(userId, unidade.id, depto.id);
                const aviso = filaInfo.status === 'em_atendimento'
                  ? 'Voce esta sendo atendido agora.'
                  : `Voce entrou na fila. Sua posicao e ${filaInfo.position}. Voce sera avisado a cada ${filaConfig.intervaloAvisoSeg} segundos.`;

                await client.sendText(userId, `${depto.mensagem}

${aviso}`);
                botIntegration.registrarInteracao(userId, 'contato_departamento', { 
                  unidade: unidade.nome, 
                  departamento: depto.nome 
                });
                state.menu = 'fila';
              }
            } else {
              // Departamento generico (Administrativo, Agendamento, Financeiro)
              const nomesDeptos = ['Administrativo', 'Vendas', 'Agendamento', 'Financeiro'];
              const deptoNome = nomesDeptos[index] || 'Departamento';
              
              await client.sendText(
                userId,
                `?? *${deptoNome}*

` +
                `Estamos direcionando sua solicitacao.
` +
                `Um atendente entrara em contato em breve.

` +
                `_Horario de atendimento:_
` +
                `Segunda a Sexta: 08:00 - 18:00
` +
                `Sabado: 08:00 - 12:00

` +
                `Digite *menu* para voltar ao inicio.`
              );
              
              botIntegration.registrarInteracao(userId, 'contato_departamento', { 
                unidade: unidade.nome, 
                departamento: deptoNome 
              });
            }
          }
          else {
            await client.sendText(userId, '? Opcao invalida. Digite um numero valido ou *0* para voltar.');
          }
        }

        // === MENU DE VENDEDORES ===
        else if (state.menu === 'vendedores') {
          const unidade = config.unidades.find(u => u.id === state.unidadeId);
          const vendedores = config.vendedores[unidade.id] || [];
          
          if (userInput === '0') {
            state.menu = 'departamentos';
            const departamentos = config.departamentos[unidade.id] || [];
            const mensagem = botIntegration.gerarMenuDepartamentos(unidade, departamentos);
            await client.sendText(userId, mensagem);
          }
          else if (/^[1-9]$/.test(userInput)) {
            const index = parseInt(userInput) - 1;
            if (vendedores[index]) {
              const vendedor = vendedores[index];
              const mensagem = botIntegration.gerarMensagemTransferencia(vendedor);
              await client.sendText(userId, mensagem);
              
              botIntegration.registrarInteracao(userId, 'transferencia_vendedor', { 
                unidade: unidade.nome,
                vendedor: vendedor.nome,
                numero: vendedor.numero
              });
              await botIntegration.atualizarStatusConversa(userId, 'finalizada', unidade.id, null);
              
              console.log(`[TRANSFERÊNCIA] ${userId} -> ${vendedor.nome} (${vendedor.numero})`);
              state.menu = 'inicial';
            } else {
              await client.sendText(userId, '❓ Vendedor não encontrado. Digite *0* para voltar.');
            }
          }
          else {
            await client.sendText(userId, '❓ Opção inválida. Digite um número válido ou *0* para voltar.');
          }
        }

        // === OPÇÃO NÃO RECONHECIDA ===
        else {
          await client.sendText(
            userId,
            '❓ Opção não reconhecida.\n\n' +
            'Digite *menu* para ver as opções disponíveis.'
          );
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
