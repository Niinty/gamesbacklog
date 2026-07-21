# Próxima Fase 🎲

App estático (HTML/CSS/JS puro, sem build) que sorteia um jogo do seu backlog e guarda tudo em `data/games.json`, versionado no seu repositório do GitHub.

## Estrutura

```
proxima-fase/
├── index.html
├── styles.css
├── app.js
└── data/
    └── games.json   ← "banco de dados" dos jogos
```

## 1. Subir pro GitHub

```bash
cd proxima-fase
git init
git add .
git commit -m "Primeira versão do Próxima Fase"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/SEU_REPO.git
git push -u origin main
```

## 2. Ativar o GitHub Pages

No repositório: **Settings → Pages → Source: Deploy from a branch → Branch: `main` / pasta `/ (root)`**.
Em alguns minutos o app estará em `https://SEU_USUARIO.github.io/SEU_REPO/`.

> Rodar localmente sem Pages? Não abra o `index.html` direto no navegador (o `fetch` de arquivo local é bloqueado). Use um servidor simples: `npx serve .` ou `python3 -m http.server`.

## 3. Criar um token pra permitir salvar mudanças

O app só consegue **ler** `games.json` sem token (arquivo público). Pra **gravar** (adicionar jogo, marcar concluído, editar, remover), ele precisa de um token pessoal com permissão de escrita nesse repositório:

1. GitHub → **Settings** (da sua conta) → **Developer settings** → **Personal access tokens** → **Fine-grained tokens** → **Generate new token**.
2. Em **Repository access**, selecione apenas o repositório `proxima-fase` (ou o nome que você usou).
3. Em **Permissions → Repository permissions**, defina **Contents: Read and write**.
4. Gere o token e copie (ele só aparece uma vez).
5. No app, abra a aba **⚙** e preencha:
   - Usuário/organização (seu usuário do GitHub)
   - Nome do repositório
   - Branch (geralmente `main`)
   - Token
6. Clique em **Testar conexão** e depois em **Salvar configuração**.

O token fica salvo só no `localStorage` do seu navegador — nunca é commitado nem sai do seu dispositivo, mas qualquer pessoa com acesso físico ao seu navegador logado poderia vê-lo. Como é um projeto de uso pessoal, isso é aceitável; se quiser mais segurança, dá pra restringir ainda mais o escopo do token (fine-grained, só nesse repo).

## Como funciona o sorteio

- Só entram no sorteio jogos com `status: "pendente"`.
- Ao marcar um jogo como **Concluído**, ele sai do sorteio e vai para a aba **Concluídos** (dá pra reabrir depois).
- Cada alteração (adicionar, editar, concluir, reabrir, remover) gera um commit automático no `games.json` via API do GitHub.

## Editando `games.json` na mão

Também dá pra editar o arquivo direto pelo GitHub (ou localmente + `git push`), sem passar pelo app. Formato de cada jogo:

```json
{
  "id": "identificador único",
  "titulo": "Nome do jogo",
  "capa": "URL da imagem de capa",
  "estilo": "Ex: Metroidvania, RPG...",
  "descricao": "Texto livre",
  "video": "URL do YouTube ou .mp4",
  "status": "pendente | concluido",
  "adicionadoEm": "data ISO",
  "concluidoEm": "data ISO ou null"
}
```
