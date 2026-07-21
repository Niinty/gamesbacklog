// ---------------------------------------------------------------
// Próxima Fase — app.js
// ---------------------------------------------------------------

const STORAGE_CONFIG_KEY = "proximaFase.config";
const DATA_PATH = "data/games.json";

let games = [];
let currentDrawId = null;
let editingId = null;
let fileSha = null; // sha do games.json no GitHub, necessário pra sobrescrever

// ---------------- Config (GitHub) ----------------

function getConfig() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_CONFIG_KEY)) || {};
  } catch {
    return {};
  }
}

function saveConfig(cfg) {
  localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(cfg));
}

function isConfigured() {
  const c = getConfig();
  return !!(c.owner && c.repo && c.branch && c.token);
}

// ---------------- Banner ----------------

function showBanner(msg, type = "") {
  const el = document.getElementById("banner");
  el.textContent = msg;
  el.className = "banner" + (type ? " " + type : "");
  el.hidden = false;
}
function hideBanner() {
  document.getElementById("banner").hidden = true;
}

// ---------------- Data loading ----------------

async function loadGames() {
  const cfg = getConfig();

  // Se configurado, sempre lê via API do GitHub (fonte mais atual, com sha)
  if (isConfigured()) {
    try {
      const res = await fetch(
        `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${DATA_PATH}?ref=${cfg.branch}`,
        { headers: { Authorization: `Bearer ${cfg.token}`, Accept: "application/vnd.github+json" } }
      );
      if (!res.ok) throw new Error(`GitHub respondeu ${res.status}`);
      const json = await res.json();
      fileSha = json.sha;
      const content = decodeURIComponent(escape(atob(json.content.replace(/\n/g, ""))));
      games = JSON.parse(content);
      hideBanner();
      return;
    } catch (err) {
      showBanner("Não consegui ler o games.json via API do GitHub (" + err.message + "). Mostrando dados locais.", "error");
    }
  }

  // Fallback: leitura estática relativa (funciona no GitHub Pages sem token, só leitura)
  try {
    const res = await fetch(DATA_PATH, { cache: "no-store" });
    games = await res.json();
  } catch (err) {
    games = [];
    showBanner("Não foi possível carregar data/games.json. Configure a conexão com o GitHub na aba ⚙.", "error");
  }
}

// ---------------- Persist to GitHub ----------------

async function persistGames(commitMessage) {
  const cfg = getConfig();
  if (!isConfigured()) {
    showBanner("Alteração feita só localmente — configure seu token do GitHub em ⚙ para salvar no repositório.", "error");
    return false;
  }
  try {
    const content = btoa(unescape(encodeURIComponent(JSON.stringify(games, null, 2))));
    const body = {
      message: commitMessage,
      content,
      branch: cfg.branch,
    };
    if (fileSha) body.sha = fileSha;

    const res = await fetch(
      `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${DATA_PATH}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${cfg.token}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.message || `status ${res.status}`);
    }
    const json = await res.json();
    fileSha = json.content.sha;
    showBanner("Salvo no repositório ✓", "success");
    setTimeout(hideBanner, 2500);
    return true;
  } catch (err) {
    showBanner("Falha ao salvar no GitHub: " + err.message, "error");
    return false;
  }
}

// ---------------- Helpers ----------------

function pendentes() {
  return games.filter((g) => g.status === "pendente");
}
function concluidos() {
  return games.filter((g) => g.status === "concluido");
}

function catalogNum(id) {
  const idx = games.findIndex((g) => g.id === id);
  return "Nº " + String(idx + 1).padStart(3, "0");
}

function videoEmbedHtml(url) {
  if (!url) return "";
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  if (yt) {
    return `<iframe src="https://www.youtube.com/embed/${yt[1]}" title="trailer" frameborder="0" allowfullscreen></iframe>`;
  }
  if (/\.(mp4|webm|ogg)$/i.test(url)) {
    return `<video controls src="${url}"></video>`;
  }
  return `<a class="btn btn-ghost" href="${url}" target="_blank" rel="noopener">▶ Ver vídeo</a>`;
}

function uid() {
  return "g-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
}

// ---------------- Rendering ----------------

function renderCounts() {
  document.getElementById("count-fila").textContent = pendentes().length;
  document.getElementById("count-concluidos").textContent = concluidos().length;
}

function renderSorteioEmpty() {
  document.getElementById("sorteio-vazio").hidden = pendentes().length !== 0;
  document.getElementById("sorteio-inicial").hidden = pendentes().length === 0 || currentDrawId !== null;
  document.getElementById("ticket").hidden = true;
}

function renderTicket(game) {
  document.getElementById("sorteio-vazio").hidden = true;
  document.getElementById("sorteio-inicial").hidden = true;
  const ticket = document.getElementById("ticket");
  ticket.hidden = false;

  document.getElementById("ticket-num").textContent = catalogNum(game.id);
  document.getElementById("ticket-tag").textContent = game.status === "concluido" ? "CONCLUÍDO" : "PRÓXIMA FASE";
  document.getElementById("ticket-capa").src = game.capa;
  document.getElementById("ticket-capa").alt = "Capa de " + game.titulo;
  document.getElementById("ticket-estilo").textContent = game.estilo || "—";
  document.getElementById("ticket-titulo").textContent = game.titulo;
  document.getElementById("ticket-descricao").textContent = game.descricao || "Sem descrição ainda.";
  document.getElementById("ticket-video").innerHTML = videoEmbedHtml(game.video);

  document.getElementById("btn-concluir").hidden = game.status === "concluido";
}

function drawRandom() {
  const pool = pendentes();
  if (pool.length === 0) {
    currentDrawId = null;
    renderSorteioEmpty();
    return;
  }
  const pick = pool[Math.floor(Math.random() * pool.length)];
  currentDrawId = pick.id;
  renderTicket(pick);
}

function renderGrid(containerId, list, kind) {
  const el = document.getElementById(containerId);
  el.innerHTML = "";
  if (list.length === 0) {
    el.innerHTML = `<p style="color:var(--text-muted);font-size:14px;">Nada por aqui ainda.</p>`;
    return;
  }
  list.forEach((g) => {
    const card = document.createElement("div");
    card.className = "card" + (kind === "concluido" ? " concluido" : "");
    card.innerHTML = `
      <div class="card-cover"><img src="${g.capa}" alt="Capa de ${g.titulo}"></div>
      <div class="card-body">
        <span class="card-estilo">${g.estilo || "—"}</span>
        <span class="card-titulo">${g.titulo}</span>
        ${kind === "concluido" && g.concluidoEm ? `<span class="card-date">concluído em ${new Date(g.concluidoEm).toLocaleDateString("pt-BR")}</span>` : ""}
        <div class="card-actions">
          ${kind === "pendente" ? `<button class="btn btn-primary" data-action="ver" data-id="${g.id}">Ver</button>` : `<button class="btn btn-ghost" data-action="reabrir" data-id="${g.id}">↺ Reabrir</button>`}
          <button class="btn btn-ghost" data-action="editar" data-id="${g.id}">✎</button>
        </div>
      </div>`;
    el.appendChild(card);
  });
}

function renderAll() {
  renderCounts();
  renderGrid("grid-fila", pendentes(), "pendente");
  renderGrid("grid-concluidos", concluidos(), "concluido");
  if (currentDrawId) {
    const g = games.find((x) => x.id === currentDrawId);
    if (g && g.status === "pendente") renderTicket(g);
    else { currentDrawId = null; renderSorteioEmpty(); }
  } else {
    renderSorteioEmpty();
  }
}

// ---------------- View switching ----------------

function switchView(view) {
  document.querySelectorAll(".tab-btn").forEach((b) => b.classList.toggle("active", b.dataset.view === view));
  document.querySelectorAll(".view").forEach((v) => v.classList.toggle("active", v.id === "view-" + view));
}

// ---------------- Form (add/edit) ----------------

function resetForm() {
  editingId = null;
  document.getElementById("form-title").textContent = "Adicionar jogo";
  document.getElementById("btn-salvar-jogo").textContent = "Salvar jogo";
  document.getElementById("btn-cancelar-edicao").hidden = true;
  document.getElementById("form-jogo").reset();
  document.getElementById("f-preview-wrap").hidden = true;
}

function fillFormForEdit(game) {
  editingId = game.id;
  document.getElementById("form-title").textContent = "Editar jogo";
  document.getElementById("btn-salvar-jogo").textContent = "Salvar alterações";
  document.getElementById("btn-cancelar-edicao").hidden = false;
  document.getElementById("f-id").value = game.id;
  document.getElementById("f-titulo").value = game.titulo;
  document.getElementById("f-capa").value = game.capa;
  document.getElementById("f-estilo").value = game.estilo || "";
  document.getElementById("f-descricao").value = game.descricao || "";
  document.getElementById("f-video").value = game.video || "";
  document.getElementById("f-preview").src = game.capa;
  document.getElementById("f-preview-wrap").hidden = false;
  switchView("adicionar");
}

// ---------------- Event wiring ----------------

document.getElementById("tabs").addEventListener("click", (e) => {
  const btn = e.target.closest(".tab-btn");
  if (!btn) return;
  if (btn.dataset.view === "adicionar" && editingId === null) resetForm();
  switchView(btn.dataset.view);
});

document.getElementById("btn-sortear-inicial").addEventListener("click", drawRandom);
document.getElementById("btn-resortear").addEventListener("click", drawRandom);

document.getElementById("btn-concluir").addEventListener("click", async () => {
  const g = games.find((x) => x.id === currentDrawId);
  if (!g) return;
  g.status = "concluido";
  g.concluidoEm = new Date().toISOString();
  await persistGames(`Marca "${g.titulo}" como concluído`);
  currentDrawId = null;
  renderAll();
});

document.getElementById("btn-editar").addEventListener("click", () => {
  const g = games.find((x) => x.id === currentDrawId);
  if (g) fillFormForEdit(g);
});

document.getElementById("btn-remover").addEventListener("click", async () => {
  const g = games.find((x) => x.id === currentDrawId);
  if (!g) return;
  if (!confirm(`Remover "${g.titulo}" da lista? Essa ação não pode ser desfeita.`)) return;
  games = games.filter((x) => x.id !== g.id);
  await persistGames(`Remove "${g.titulo}"`);
  currentDrawId = null;
  renderAll();
});

document.getElementById("form-jogo").addEventListener("submit", async (e) => {
  e.preventDefault();
  const titulo = document.getElementById("f-titulo").value.trim();
  const capa = document.getElementById("f-capa").value.trim();
  const estilo = document.getElementById("f-estilo").value.trim();
  const descricao = document.getElementById("f-descricao").value.trim();
  const video = document.getElementById("f-video").value.trim();

  if (editingId) {
    const g = games.find((x) => x.id === editingId);
    Object.assign(g, { titulo, capa, estilo, descricao, video });
    await persistGames(`Edita "${titulo}"`);
  } else {
    games.push({
      id: uid(),
      titulo, capa, estilo, descricao, video,
      status: "pendente",
      adicionadoEm: new Date().toISOString(),
      concluidoEm: null,
    });
    await persistGames(`Adiciona "${titulo}"`);
  }
  resetForm();
  renderAll();
  switchView("fila");
});

document.getElementById("btn-cancelar-edicao").addEventListener("click", () => {
  resetForm();
});

document.getElementById("f-capa").addEventListener("input", (e) => {
  const url = e.target.value.trim();
  const wrap = document.getElementById("f-preview-wrap");
  if (url) {
    document.getElementById("f-preview").src = url;
    wrap.hidden = false;
  } else {
    wrap.hidden = true;
  }
});

document.querySelectorAll(".grid").forEach((grid) => {
  grid.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const g = games.find((x) => x.id === btn.dataset.id);
    if (!g) return;
    const action = btn.dataset.action;

    if (action === "ver") {
      currentDrawId = g.id;
      renderTicket(g);
      switchView("sortear");
    } else if (action === "editar") {
      fillFormForEdit(g);
    } else if (action === "reabrir") {
      g.status = "pendente";
      g.concluidoEm = null;
      await persistGames(`Reabre "${g.titulo}"`);
      renderAll();
    }
  });
});

// ---------------- Config form ----------------

function loadConfigIntoForm() {
  const c = getConfig();
  document.getElementById("c-owner").value = c.owner || "";
  document.getElementById("c-repo").value = c.repo || "";
  document.getElementById("c-branch").value = c.branch || "main";
  document.getElementById("c-token").value = c.token || "";
}

document.getElementById("form-config").addEventListener("submit", async (e) => {
  e.preventDefault();
  const cfg = {
    owner: document.getElementById("c-owner").value.trim(),
    repo: document.getElementById("c-repo").value.trim(),
    branch: document.getElementById("c-branch").value.trim() || "main",
    token: document.getElementById("c-token").value.trim(),
  };
  saveConfig(cfg);
  document.getElementById("config-status").textContent = "Configuração salva. Recarregando dados...";
  await loadGames();
  renderAll();
  document.getElementById("config-status").textContent = "Configuração salva e dados recarregados ✓";
});

document.getElementById("btn-testar-conexao").addEventListener("click", async () => {
  const cfg = {
    owner: document.getElementById("c-owner").value.trim(),
    repo: document.getElementById("c-repo").value.trim(),
    branch: document.getElementById("c-branch").value.trim() || "main",
    token: document.getElementById("c-token").value.trim(),
  };
  const statusEl = document.getElementById("config-status");
  statusEl.textContent = "Testando...";
  try {
    const res = await fetch(`https://api.github.com/repos/${cfg.owner}/${cfg.repo}`, {
      headers: { Authorization: `Bearer ${cfg.token}`, Accept: "application/vnd.github+json" },
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    statusEl.textContent = "Conexão OK ✓ Repositório encontrado.";
  } catch (err) {
    statusEl.textContent = "Falha na conexão: " + err.message;
  }
});

// ---------------- Init ----------------

(async function init() {
  loadConfigIntoForm();
  await loadGames();
  renderAll();
})();
