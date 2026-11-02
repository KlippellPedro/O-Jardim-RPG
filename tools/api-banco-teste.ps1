# Sobe a API contra o Postgres DESCARTÁVEL de teste (Docker, porta 5434), nunca o
# banco de desenvolvimento. É a receita da revisão visual: backup automático
# desligado e cadastro aberto. Usado pelo .claude/launch.json ("Plataforma API
# (banco de teste)"); as variáveis daqui ganham do .env.
$env:DATABASE_URL = 'postgresql://jardim:jardim-local@127.0.0.1:5434/jardim_teste'
$env:APP_ENV = 'development'
$env:AUTOMATIC_BACKUP_ENABLED = 'false'
$env:CADASTRO = 'aberto'
Set-Location (Join-Path $PSScriptRoot '..\plataforma')
& .\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8080
