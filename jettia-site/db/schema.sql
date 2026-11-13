-- Banco D1 (Cloudflare) para as inscrições Jettia 2027
CREATE TABLE IF NOT EXISTS inscricoes (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  criado_em           TEXT    NOT NULL,
  nome                TEXT    NOT NULL,
  data_nascimento     TEXT    NOT NULL,
  idade               INTEGER NOT NULL,
  cpf                 TEXT    NOT NULL,
  cidade              TEXT    NOT NULL,
  bairro              TEXT    NOT NULL,
  telefone            TEXT    NOT NULL,
  email               TEXT    NOT NULL,
  ja_participou_grupo TEXT    NOT NULL,
  experiencia_danca   TEXT    NOT NULL,
  disponibilidade     TEXT    NOT NULL,
  motivo              TEXT    NOT NULL,
  resp_nome           TEXT,
  resp_cpf            TEXT,
  resp_telefone       TEXT,
  camiseta            TEXT    NOT NULL,
  calca               TEXT    NOT NULL,
  calcado             TEXT    NOT NULL,
  moletom             TEXT    NOT NULL,
  aut_participacao    INTEGER NOT NULL,
  aut_imagem          INTEGER NOT NULL DEFAULT 0,
  decl_veracidade     INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_inscricoes_criado_em ON inscricoes (criado_em);
