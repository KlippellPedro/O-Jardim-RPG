const STORAGE_KEY = 'jardim-rpg';
const STORAGE_PREFIX = `${STORAGE_KEY}:`;
const BACKUP_PREFIX = `${STORAGE_PREFIX}_backup_`;
const BACKUP_INTERVAL_MS = 10 * 60 * 1000;
const MAX_BACKUPS = 12;
let backupTimer = null;

function chavesDoProjeto({ incluirBackups = false } = {}) {
  return Object.keys(localStorage).filter(chave => (
    chave.startsWith(STORAGE_PREFIX)
    && (incluirBackups || !chave.startsWith(BACKUP_PREFIX))
  ));
}

function validarPacote(pacote) {
  if (!pacote || typeof pacote !== 'object' || Array.isArray(pacote)) {
    throw new Error('Pacote de dados inválido.');
  }

  if (!pacote.dados || typeof pacote.dados !== 'object' || Array.isArray(pacote.dados)) {
    throw new Error('O arquivo não contém um objeto "dados" válido.');
  }

  const chavesInvalidas = Object.keys(pacote.dados)
    .filter(chave => !chave.startsWith(STORAGE_PREFIX) || chave.startsWith(BACKUP_PREFIX));

  if (chavesInvalidas.length > 0) {
    throw new Error('O arquivo contém chaves que não pertencem ao Jardim RPG.');
  }

  return pacote;
}

function criarBackup() {
  try {
    const backup = {};
    chavesDoProjeto().forEach(chave => {
      backup[chave] = localStorage.getItem(chave);
    });

    localStorage.setItem(
      `${BACKUP_PREFIX}${new Date().toISOString()}`,
      JSON.stringify(backup),
    );

    const backups = Object.keys(localStorage)
      .filter(chave => chave.startsWith(BACKUP_PREFIX))
      .sort();

    backups.slice(0, Math.max(0, backups.length - MAX_BACKUPS))
      .forEach(chave => localStorage.removeItem(chave));
  } catch (erro) {
    console.error('Não foi possível criar o backup automático.', erro);
  }
}

export const storage = {
  get(key) {
    try {
      const raw = localStorage.getItem(`${STORAGE_KEY}:${key}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(value));
      return true;
    } catch (erro) {
      console.error(`Não foi possível salvar "${key}".`, erro);
      return false;
    }
  },

  remove(key) {
    try {
      localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
      return true;
    } catch (erro) {
      console.error(`Não foi possível remover "${key}".`, erro);
      return false;
    }
  },

  exportar(filename = 'jardim-rpg-save') {
    const dados = {};
    chavesDoProjeto().forEach(k => {
      try { dados[k] = JSON.parse(localStorage.getItem(k)); } catch { dados[k] = localStorage.getItem(k); }
    });
    const pacote = {
      dados,
      exportadoEm: new Date().toLocaleString('pt-BR'),
      versao: '1.0'
    };
    const blob = new Blob([JSON.stringify(pacote, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = `${filename}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  },

  importar(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const pacote = validarPacote(JSON.parse(e.target.result));
          Object.entries(pacote.dados).forEach(([k, v]) => {
            localStorage.setItem(k, JSON.stringify(v));
          });
          resolve(pacote);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Não foi possível ler o arquivo selecionado.'));
      reader.readAsText(file);
    });
  },

  iniciarBackupAutomatico() {
    if (backupTimer !== null) return;
    backupTimer = setInterval(criarBackup, BACKUP_INTERVAL_MS);
  },

  pararBackupAutomatico() {
    if (backupTimer === null) return;
    clearInterval(backupTimer);
    backupTimer = null;
  }
};
