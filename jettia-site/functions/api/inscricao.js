// POST /api/inscricao — valida no servidor e grava no banco D1 (binding "DB").

const SIZES = ['PP', 'P', 'M', 'G', 'GG', 'XGG'];
const DISP = ['semana', 'sabado', 'domingo', 'flexivel'];
const SIM_NAO = ['sim', 'nao'];

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });

const txt = (v, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const digits = v => (typeof v === 'string' ? v.replace(/\D/g, '') : '');

function cpfValido(valor) {
  const c = digits(valor);
  if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false;
  for (let t = 9; t < 11; t++) {
    let soma = 0;
    for (let i = 0; i < t; i++) soma += Number(c[i]) * (t + 1 - i);
    const dv = ((soma * 10) % 11) % 10;
    if (dv !== Number(c[t])) return false;
  }
  return true;
}

function idadeDe(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return null;
  const nasc = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  const hoje = new Date();
  if (isNaN(nasc) || nasc > hoje) return null;
  let idade = hoje.getUTCFullYear() - nasc.getUTCFullYear();
  const dm = hoje.getUTCMonth() - nasc.getUTCMonth();
  if (dm < 0 || (dm === 0 && hoje.getUTCDate() < nasc.getUTCDate())) idade--;
  return idade;
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ ok: false, erro: 'Banco de dados não configurado.' }, 500);

  let d;
  try {
    d = await request.json();
  } catch {
    return json({ ok: false, erro: 'Requisição inválida.' }, 400);
  }

  // Armadilha anti-robô: campo oculto preenchido indica bot. Finge sucesso sem gravar.
  if (txt(d.site)) return json({ ok: true, protocolo: 0 });

  const erros = [];

  const nome = txt(d.nome, 120);
  if (nome.length < 3) erros.push('nome');

  const idade = idadeDe(d.nascimento);
  if (idade === null || idade < 5 || idade > 120) erros.push('data de nascimento');

  if (!cpfValido(d.cpf)) erros.push('CPF');

  const cidade = txt(d.cidade, 80);
  const bairro = txt(d.bairro, 80);
  if (cidade.length < 2) erros.push('cidade');
  if (bairro.length < 2) erros.push('bairro');

  const telefone = digits(d.telefone);
  if (telefone.length < 10 || telefone.length > 11) erros.push('telefone');

  const email = txt(d.email, 120);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) erros.push('e-mail');

  if (!SIM_NAO.includes(d.ja_participou_grupo)) erros.push('participação em grupo');
  if (!SIM_NAO.includes(d.experiencia_danca)) erros.push('experiência com dança');

  const disp = Array.isArray(d.disponibilidade) ? d.disponibilidade.filter(x => DISP.includes(x)) : [];
  if (disp.length === 0) erros.push('disponibilidade');

  const motivo = txt(d.motivo, 1500);
  if (motivo.length < 20) erros.push('motivo');

  if (!SIZES.includes(d.camiseta)) erros.push('camiseta');
  if (!SIZES.includes(d.calca)) erros.push('calça');
  if (!SIZES.includes(d.moletom)) erros.push('moletom');

  let calcado = String(d.calcado || '');
  if (calcado === 'OUTRO') {
    const outro = txt(d.calcado_outro, 10);
    if (!/^\d{2}$/.test(outro)) erros.push('numeração do calçado');
    calcado = `OUTRO: ${outro}`;
  } else if (!/^(2[89]|3\d|4[0-6])$/.test(calcado)) {
    erros.push('calçado');
  }

  if (d.aut_participacao !== true) erros.push('autorização de participação');
  if (d.decl_veracidade !== true) erros.push('declaração de veracidade');

  const menor = idade !== null && idade < 18;
  let respNome = '', respCpf = '', respTel = '';
  if (menor) {
    respNome = txt(d.resp_nome, 120);
    respCpf = digits(d.resp_cpf);
    respTel = digits(d.resp_telefone);
    if (respNome.length < 3) erros.push('nome do responsável');
    if (!cpfValido(respCpf)) erros.push('CPF do responsável');
    if (respTel.length < 10 || respTel.length > 11) erros.push('telefone do responsável');
  }

  if (erros.length) {
    return json({ ok: false, erro: `Verifique os campos: ${erros.join(', ')}.` }, 422);
  }

  try {
    const r = await env.DB.prepare(`
      INSERT INTO inscricoes (
        criado_em, nome, data_nascimento, idade, cpf, cidade, bairro, telefone, email,
        ja_participou_grupo, experiencia_danca, disponibilidade, motivo,
        resp_nome, resp_cpf, resp_telefone,
        camiseta, calca, calcado, moletom,
        aut_participacao, aut_imagem, decl_veracidade
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).bind(
      new Date().toISOString(), nome, d.nascimento, idade, digits(d.cpf), cidade, bairro, telefone, email,
      d.ja_participou_grupo, d.experiencia_danca, disp.join(','), motivo,
      respNome, respCpf, respTel,
      d.camiseta, d.calca, calcado, d.moletom,
      1, d.aut_imagem === true ? 1 : 0, 1
    ).run();

    return json({ ok: true, protocolo: r.meta?.last_row_id ?? 0 });
  } catch (err) {
    // Só confirma ao usuário quando a gravação realmente ocorreu.
    return json({ ok: false, erro: 'Não foi possível salvar sua inscrição agora. Tente novamente em instantes.' }, 500);
  }
}
