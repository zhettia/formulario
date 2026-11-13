const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduzir = matchMedia('(prefers-reduced-motion: reduce)').matches;

const NOMES = {
  '1': 'Dados pessoais',
  '2': 'Participação',
  '3': 'Responsável',
  '4': 'Uniforme',
  '5': 'Autorizações',
  'revisao': 'Revisão'
};
const DISPONIBILIDADE = {
  semana: 'Durante a semana',
  sabado: 'Aos sábados',
  domingo: 'Aos domingos',
  flexivel: 'Flexibilidade de horários'
};

const form = $('#form-inscricao');
let menor = false;
let atual = '1';

/* ---------- Utilidades ---------- */
const soDigitos = v => (v || '').replace(/\D/g, '');

function cpfValido(valor) {
  const c = soDigitos(valor);
  if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false;
  for (let t = 9; t < 11; t++) {
    let soma = 0;
    for (let i = 0; i < t; i++) soma += Number(c[i]) * (t + 1 - i);
    const digito = ((soma * 10) % 11) % 10;
    if (digito !== Number(c[t])) return false;
  }
  return true;
}

function idadeDe(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return null;
  const nasc = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  const hoje = new Date();
  if (nasc > hoje) return null;
  let idade = hoje.getUTCFullYear() - nasc.getUTCFullYear();
  const dm = hoje.getUTCMonth() - nasc.getUTCMonth();
  if (dm < 0 || (dm === 0 && hoje.getUTCDate() < nasc.getUTCDate())) idade--;
  return idade;
}

function mascaraCPF(v) {
  return soDigitos(v).slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function mascaraTel(v) {
  const d = soDigitos(v).slice(0, 11);
  if (d.length <= 10) {
    return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
  }
  return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
}

function formatarData(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '—';
}

/* ---------- Abertura (três logos + flutuação) ---------- */
const l2 = $('#logo-2'), l3 = $('#logo-3');
const conteudo = $('#conteudo');
const botaoPular = $('#pular');
const timers = [];
const agendar = (ms, fn) => timers.push(setTimeout(fn, ms));
const mostrar = el => el.classList.add('visivel');
const esconder = el => { el.classList.remove('visivel'); el.classList.add('saindo'); };

function estadoFinal() {
  timers.forEach(clearTimeout);
  esconder(l2);
  mostrar(l3);
  l3.classList.add('flutua');
  conteudo.classList.add('visivel');
  botaoPular.hidden = true;
}

function sequencia() {
  if (reduzir) return estadoFinal();
  agendar(300, () => mostrar(l2));
  agendar(2800, () => esconder(l2));
  agendar(3300, () => mostrar(l3));
  agendar(5100, () => {
    l3.classList.add('flutua');
    conteudo.classList.add('visivel');
    botaoPular.hidden = true;
  });
}

botaoPular.addEventListener('click', estadoFinal);

/* ---------- Abrir formulário ---------- */
const formulario = $('#formulario');
$('#btn-inscrever').addEventListener('click', () => {
  formulario.hidden = false;
  requestAnimationFrame(() => {
    formulario.classList.add('visivel');
    formulario.scrollIntoView({ behavior: reduzir ? 'auto' : 'smooth', block: 'start' });
    $('#titulo-form').focus({ preventScroll: true });
  });
});

/* ---------- Chips (tamanhos) ---------- */
function montarChips() {
  $$('[data-campo]').forEach(caixa => {
    const campo = caixa.dataset.campo;
    let opcoes;
    if (caixa.dataset.min) {
      opcoes = [];
      for (let n = +caixa.dataset.min; n <= +caixa.dataset.max; n++) opcoes.push(String(n));
      opcoes.push('OUTRO');
    } else {
      opcoes = caixa.dataset.opcoes.split(',');
    }
    caixa.innerHTML = opcoes.map(o => `
      <label class="chip">
        <input type="radio" name="${campo}" value="${o}" required>
        <span>${o === 'OUTRO' ? 'Outro' : o}</span>
      </label>`).join('');
  });
}

function atualizarOutroCalcado() {
  const outro = $('[name="calcado"]:checked')?.value === 'OUTRO';
  $('#campo-calcado-outro').hidden = !outro;
  $('[name="calcado_outro"]').required = outro;
}

/* ---------- Idade e etapa de responsável ---------- */
function atualizarIdade() {
  const idade = idadeDe($('[name="nascimento"]').value);
  $('[name="idade"]').value = idade !== null ? idade : '';
  menor = idade !== null && idade < 18;
  $$('[data-etapa="3"] input').forEach(i => { i.required = menor; });
  mostrarEtapa();
}

/* ---------- Validação ---------- */
function ajustarValidade() {
  const cpf = $('[name="cpf"]');
  cpf.setCustomValidity(cpf.value && !cpfValido(cpf.value) ? 'CPF inválido.' : '');

  const rcpf = $('[name="resp_cpf"]');
  rcpf.setCustomValidity(rcpf.value && !cpfValido(rcpf.value) ? 'CPF do responsável inválido.' : '');

  const tel = $('[name="telefone"]');
  tel.setCustomValidity(tel.value && soDigitos(tel.value).length < 10 ? 'Telefone incompleto.' : '');

  const rtel = $('[name="resp_telefone"]');
  rtel.setCustomValidity(rtel.value && soDigitos(rtel.value).length < 10 ? 'Telefone do responsável incompleto.' : '');

  const motivo = $('[name="motivo"]');
  const tam = motivo.value.trim().length;
  motivo.setCustomValidity(tam > 0 && tam < 20 ? 'Escreva pelo menos 20 caracteres.' : '');

  const email = $('[name="email"]');
  email.setCustomValidity(email.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value) ? 'E-mail inválido.' : '');
}

function validarEtapa(chave) {
  ajustarValidade();
  const fs = $(`[data-etapa="${chave}"]`, form);
  $$('.campo, .opcao', fs).forEach(c => c.classList.remove('invalido'));

  let primeiro = null;
  $$('input, select, textarea', fs).forEach(campo => {
    if (campo.disabled || !campo.willValidate) return;
    if (!campo.checkValidity()) {
      (campo.closest('.campo') || campo.closest('.opcao'))?.classList.add('invalido');
      primeiro ||= campo;
    }
  });

  if (!primeiro && chave === '2' && !fs.querySelector('[name="disponibilidade"]:checked')) {
    $('#campo-disponibilidade').classList.add('invalido');
    $('#erro').textContent = 'Marque pelo menos uma opção de disponibilidade.';
    return false;
  }

  if (primeiro) {
    $('#erro').textContent = primeiro.validationMessage || 'Preencha os campos destacados.';
    primeiro.focus();
    return false;
  }

  $('#erro').textContent = '';
  return true;
}

/* ---------- Navegação entre etapas ---------- */
const fluxo = () => [...(menor ? ['1', '2', '3', '4', '5'] : ['1', '2', '4', '5']), 'revisao'];

function mostrarEtapa() {
  const lista = fluxo();
  if (!lista.includes(atual)) atual = lista[0];
  $$('[data-etapa]', form).forEach(fs => { fs.hidden = fs.dataset.etapa !== atual; });

  const pos = lista.indexOf(atual);
  const passos = lista.length - 1;
  const pct = Math.round((pos / passos) * 100);
  $('#barra').style.width = `${pct}%`;
  $('.progresso').setAttribute('aria-valuenow', String(pct));

  $('#etapa-texto').textContent = atual === 'revisao'
    ? 'Revisão final'
    : `Etapa ${pos + 1} de ${passos} · ${NOMES[atual]}`;

  $('#lista-etapas').innerHTML = lista.map((k, i) => {
    const cls = i < pos ? 'feito' : i === pos ? 'atual' : '';
    return `<li class="${cls}">${NOMES[k]}</li>`;
  }).join('');

  $('#voltar').disabled = pos === 0;
  $('#continuar').hidden = atual === 'revisao';
  $('#finalizar').hidden = atual !== 'revisao';
}

function irPara(chave) {
  atual = chave;
  $('#erro').textContent = '';
  mostrarEtapa();
  $('#titulo-form').scrollIntoView({ behavior: reduzir ? 'auto' : 'smooth', block: 'start' });
}

$('#continuar').addEventListener('click', () => {
  if (atual === 'revisao') return;
  if (!validarEtapa(atual)) return;
  const lista = fluxo();
  const prox = lista[lista.indexOf(atual) + 1];
  if (prox === 'revisao') montarRevisao();
  irPara(prox);
});

$('#voltar').addEventListener('click', () => {
  const lista = fluxo();
  const i = lista.indexOf(atual);
  if (i > 0) irPara(lista[i - 1]);
});

/* ---------- Coleta e revisão ---------- */
function coletar() {
  const fd = new FormData(form);
  const g = k => (fd.get(k) ?? '').toString().trim();
  return {
    nome: g('nome'),
    nascimento: g('nascimento'),
    idade: g('idade'),
    cpf: g('cpf'),
    cidade: g('cidade'),
    bairro: g('bairro'),
    telefone: g('telefone'),
    email: g('email'),
    ja_participou_grupo: g('ja_participou_grupo'),
    experiencia_danca: g('experiencia_danca'),
    disponibilidade: fd.getAll('disponibilidade'),
    motivo: g('motivo'),
    resp_nome: menor ? g('resp_nome') : '',
    resp_cpf: menor ? g('resp_cpf') : '',
    resp_telefone: menor ? g('resp_telefone') : '',
    camiseta: g('camiseta'),
    calca: g('calca'),
    calcado: g('calcado'),
    calcado_outro: g('calcado') === 'OUTRO' ? g('calcado_outro') : '',
    moletom: g('moletom'),
    aut_participacao: fd.has('aut_participacao'),
    aut_imagem: fd.has('aut_imagem'),
    decl_veracidade: fd.has('decl_veracidade')
  };
}

function sim(v) { return v === 'sim' ? 'Sim' : v === 'nao' ? 'Não' : '—'; }
function autorizado(v) { return v ? 'Autorizado' : 'Não autorizado'; }

function montarRevisao() {
  const d = coletar();
  const blocos = [
    { titulo: 'Dados pessoais', etapa: '1', itens: [
      ['Nome completo', d.nome],
      ['Data de nascimento', formatarData(d.nascimento)],
      ['Idade', d.idade],
      ['CPF', d.cpf],
      ['Cidade', d.cidade],
      ['Bairro ou comunidade', d.bairro],
      ['Telefone/WhatsApp', d.telefone],
      ['E-mail', d.email]
    ]},
    { titulo: 'Participação', etapa: '2', itens: [
      ['Já participou de grupo folclórico', sim(d.ja_participou_grupo)],
      ['Experiência com dança', sim(d.experiencia_danca)],
      ['Disponibilidade', d.disponibilidade.map(x => DISPONIBILIDADE[x]).join(', ') || '—'],
      ['Motivo', d.motivo]
    ]},
    menor && { titulo: 'Responsável legal', etapa: '3', itens: [
      ['Nome', d.resp_nome],
      ['CPF', d.resp_cpf],
      ['Telefone/WhatsApp', d.resp_telefone]
    ]},
    { titulo: 'Uniforme', etapa: '4', itens: [
      ['Camiseta', d.camiseta],
      ['Calça', d.calca],
      ['Calçado', d.calcado === 'OUTRO' ? `Outro: ${d.calcado_outro}` : d.calcado],
      ['Moletom', d.moletom]
    ]},
    { titulo: 'Autorizações', etapa: '5', itens: [
      ['Participação', autorizado(d.aut_participacao)],
      ['Uso de imagem', autorizado(d.aut_imagem)],
      ['Veracidade das informações', d.decl_veracidade ? 'Declarado' : 'Não declarado']
    ]}
  ].filter(Boolean);

  const caixa = $('#revisao');
  caixa.replaceChildren(...blocos.map(b => {
    const sec = document.createElement('section');
    sec.className = 'revisao-bloco';

    const cab = document.createElement('div');
    cab.className = 'revisao-cabecalho';
    const h = document.createElement('h3');
    h.textContent = b.titulo;
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'editar';
    edit.dataset.ir = b.etapa;
    edit.textContent = 'Editar';
    cab.append(h, edit);

    const dl = document.createElement('dl');
    b.itens.forEach(([rot, val]) => {
      const dt = document.createElement('dt');
      dt.textContent = rot;
      const dd = document.createElement('dd');
      dd.textContent = val || '—';
      dl.append(dt, dd);
    });

    sec.append(cab, dl);
    return sec;
  }));
}

$('#revisao').addEventListener('click', e => {
  const alvo = e.target.closest('[data-ir]');
  if (alvo) irPara(alvo.dataset.ir);
});

/* ---------- Envio ---------- */
form.addEventListener('submit', async e => {
  e.preventDefault();
  if (atual !== 'revisao') return;

  for (const k of fluxo().slice(0, -1)) {
    if (!validarEtapa(k)) { irPara(k); return; }
  }

  const botao = $('#finalizar');
  botao.disabled = true;
  botao.textContent = 'ENVIANDO…';
  $('#erro').textContent = '';

  try {
    const payload = { ...coletar(), site: $('[name="site"]', form).value };
    const r = await fetch('/api/inscricao', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.ok) {
      throw new Error(j.erro || 'Não foi possível concluir a inscrição. Tente novamente.');
    }
    mostrarSucesso(j.protocolo);
  } catch (err) {
    $('#erro').textContent = err.message;
  } finally {
    botao.disabled = false;
    botao.textContent = 'FINALIZAR INSCRIÇÃO';
  }
});

function mostrarSucesso(protocolo) {
  formulario.hidden = true;
  formulario.classList.remove('visivel');
  const s = $('#sucesso');
  $('#protocolo').textContent = `Protocolo: ${String(protocolo).padStart(5, '0')}`;
  s.hidden = false;
  window.scrollTo({ top: 0, behavior: 'auto' });
}

$('#voltar-inicio').addEventListener('click', () => { location.href = '/'; });

/* ---------- Inicialização ---------- */
montarChips();
$('[name="calcado"]', form) && $$('[name="calcado"]').forEach(r => r.addEventListener('change', atualizarOutroCalcado));
atualizarOutroCalcado();

$('[name="cpf"]').addEventListener('input', e => { e.target.value = mascaraCPF(e.target.value); });
$('[name="resp_cpf"]').addEventListener('input', e => { e.target.value = mascaraCPF(e.target.value); });
$('[name="telefone"]').addEventListener('input', e => { e.target.value = mascaraTel(e.target.value); });
$('[name="resp_telefone"]').addEventListener('input', e => { e.target.value = mascaraTel(e.target.value); });
$('[name="nascimento"]').addEventListener('input', atualizarIdade);
$('[name="nascimento"]').addEventListener('change', atualizarIdade);

mostrarEtapa();
sequencia();
