const STORAGE_KEY = 'jardim-rpg';
const BACKUP_INTERVAL_MS = 10 * 60 * 1000;

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
    localStorage.setItem(`${STORAGE_KEY}:${key}`, JSON.stringify(value));
  },

  remove(key) {
    localStorage.removeItem(`${STORAGE_KEY}:${key}`);
  },

  exportar(filename = 'jardim-rpg-save') {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(STORAGE_KEY));
    const dados = {};
    keys.forEach(k => {
      try { dados[k] = JSON.parse(localStorage.getItem(k)); } catch { dados[k] = localStorage.getItem(k); }
    });
    const pacote = {
      dados,
      exportadoEm: new Date().toLocaleString('pt-BR'),
      versao: '1.0'
    };
    const blob = new Blob([JSON.stringify(pacote, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${filename}.json`;
    a.click();
  },

  importar(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const pacote = JSON.parse(e.target.result);
          Object.entries(pacote.dados).forEach(([k, v]) => {
            localStorage.setItem(k, JSON.stringify(v));
          });
          resolve(pacote);
        } catch (err) {
          reject(err);
        }
      };
      reader.readAsText(file);
    });
  },

  iniciarBackupAutomatico() {
    setInterval(() => {
      const ts = new Date().toISOString();
      const backup = {};
      Object.keys(localStorage)
        .filter(k => k.startsWith(STORAGE_KEY))
        .forEach(k => { backup[k] = localStorage.getItem(k); });
      localStorage.setItem(`${STORAGE_KEY}:_backup_${ts}`, JSON.stringify(backup));
    }, BACKUP_INTERVAL_MS);
  }
};
