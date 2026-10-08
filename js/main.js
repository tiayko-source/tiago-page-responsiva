const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function store(key, value) {
  try {
    if (value === undefined) return localStorage.getItem(key);
    localStorage.setItem(key, value);
  } catch (e) { return null; }
}

/* ================= LÍNGUA ================= */
let lang = store("lang");
if (!I18N[lang]) {
  const browserLang = (navigator.language || "pt").slice(0, 2);
  lang = I18N[browserLang] ? browserLang : "pt";
}
const t = (key) => I18N[lang][key] ?? I18N.pt[key];

function applyLang(newLang) {
  lang = newLang;
  document.documentElement.lang = lang;
  document.title = t("meta.title");
  document.querySelectorAll("[data-i18n]").forEach((el) => { el.innerHTML = t(el.dataset.i18n); });
  document.querySelectorAll("[data-lang]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.lang === lang));
  restartTyping();
}
document.querySelectorAll("[data-lang]").forEach((b) => b.addEventListener("click", () => {
  applyLang(b.dataset.lang);
  store("lang", b.dataset.lang);
}));

/* ================= TEMA ================= */
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelectorAll("[data-theme-btn]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.themeBtn === theme));
}
// Só guarda o tema quando a pessoa escolhe; até lá segue o tema do sistema
document.querySelectorAll("[data-theme-btn]").forEach((b) => b.addEventListener("click", () => {
  applyTheme(b.dataset.themeBtn);
  store("theme", b.dataset.themeBtn);
}));
applyTheme(document.documentElement.dataset.theme || "dark");

/* ================= INTRO ================= */
const intro = document.getElementById("intro");
const terminal = document.getElementById("terminal");
const introName = document.getElementById("introName");
const introSub = document.getElementById("introSub");
let introFinished = false;

async function typeTerminal() {
  for (const line of t("intro.boot")) {
    if (introFinished) return;
    const div = document.createElement("div");
    div.innerHTML = line;
    terminal.appendChild(div);
    await sleep(260);
  }
}

// "Desencripta" o nome letra a letra
function decrypt(el, text, duration = 1400) {
  const glyphs = "!<>-_\\/[]{}—=+*^?#01ABCDEF";
  el.innerHTML = "";
  const spans = [...text].map((c) => {
    const s = document.createElement("span");
    s.className = "ch";
    s.textContent = c === " " ? " " : "";
    el.appendChild(s);
    return s;
  });
  const start = performance.now();
  return new Promise((resolve) => {
    function frame(now) {
      const t = (now - start) / duration;
      spans.forEach((s, i) => {
        const ch = text[i];
        if (ch === " ") return;
        const revealAt = (i / text.length) * 0.8 + 0.2;
        if (t >= revealAt || introFinished) {
          s.textContent = ch;
          s.classList.remove("scrambling");
        } else if (t > (i / text.length) * 0.5) {
          s.textContent = glyphs[(Math.random() * glyphs.length) | 0];
          s.classList.add("scrambling");
        }
      });
      if (t < 1 && !introFinished) requestAnimationFrame(frame);
      else resolve();
    }
    requestAnimationFrame(frame);
  });
}

function finishIntro() {
  if (introFinished && intro.classList.contains("is-done")) return;
  introFinished = true;
  intro.classList.add("is-done");
  document.body.classList.remove("is-loading");
  setTimeout(() => document.body.classList.add("ready"), 250);
  setTimeout(() => intro.remove(), 1300);
  startTyping();
}

async function runIntro() {
  if (reduceMotion) {
    introName.textContent = introName.dataset.text;
    return finishIntro();
  }
  await typeTerminal();
  await sleep(150);
  terminal.style.opacity = ".25";
  await decrypt(introName, introName.dataset.text);
  introSub.classList.add("show");
  await sleep(900);
  finishIntro();
}

/* ================= TYPED ROLE ================= */
const typedEl = document.getElementById("typed");
let typingStarted = false;
let typingRun = 0; // muda quando a língua muda, para parar o ciclo antigo

async function typeRoles(run) {
  const roles = t("roles");
  if (reduceMotion) { typedEl.textContent = roles[0]; return; }
  let i = 0;
  while (run === typingRun) {
    const word = roles[i % roles.length];
    for (let c = 1; c <= word.length; c++) {
      if (run !== typingRun) return;
      typedEl.textContent = word.slice(0, c); await sleep(55);
    }
    await sleep(1800);
    for (let c = word.length; c >= 0; c--) {
      if (run !== typingRun) return;
      typedEl.textContent = word.slice(0, c); await sleep(28);
    }
    await sleep(350);
    i++;
  }
}

async function startTyping() {
  if (typingStarted) return;
  typingStarted = true;
  await sleep(900);
  typeRoles(++typingRun);
}

function restartTyping() {
  if (!typingStarted) return;
  typedEl.textContent = "";
  typeRoles(++typingRun);
}

applyLang(lang);
document.getElementById("skipIntro").addEventListener("click", finishIntro);
runIntro();

/* ================= SCROLL REVEAL ================= */
// Pequeno atraso em cascata para elementos irmãos
document.querySelectorAll(".traits, .skills, .stats, .contact__list, .courses, .langs").forEach((group) => {
  [...group.children].forEach((child, i) => child.style.setProperty("--d", `${i * 0.08}s`));
});

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add("in");
    e.target.querySelectorAll("[data-count]").forEach(countUp);
    if (e.target.matches("[data-count]")) countUp(e.target);
    if (e.target.classList.contains("lang")) {
      e.target.querySelector(".lang__bar i").style.width = `${e.target.dataset.level * 20}%`;
    }
    revealObserver.unobserve(e.target);
  });
}, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });

document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));

/* ================= COUNTERS ================= */
function countUp(el) {
  if (el.dataset.done) return;
  el.dataset.done = "1";
  const target = +el.dataset.count;
  const suffix = el.dataset.suffix || "";
  if (reduceMotion) { el.textContent = target + suffix; return; }
  const dur = 1400;
  const start = performance.now();
  (function tick(now) {
    const p = Math.min((now - start) / dur, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(target * eased) + suffix;
    if (p < 1) requestAnimationFrame(tick);
  })(start);
}

/* ================= NAV ================= */
const nav = document.getElementById("nav");
const navToggle = document.getElementById("navToggle");
navToggle.addEventListener("click", () => nav.classList.toggle("open"));
document.querySelectorAll(".nav__links a").forEach((a) => a.addEventListener("click", () => nav.classList.remove("open")));

const navLinks = [...document.querySelectorAll(".nav__links a")];
const sections = navLinks.map((a) => document.querySelector(a.getAttribute("href")));

/* ================= CARTA DE APRESENTAÇÃO ================= */
const letter = document.getElementById("letter");

function closeLetter() {
  if (!letter.open || letter.classList.contains("closing")) return;
  letter.classList.add("closing");
  setTimeout(() => { letter.classList.remove("closing"); letter.close(); }, reduceMotion ? 0 : 250);
}

document.getElementById("openLetter").addEventListener("click", () => {
  letter.showModal();
  letter.scrollTop = 0;
  document.body.classList.add("letter-open"); // impede a página de fazer scroll por trás
});
document.getElementById("closeLetter").addEventListener("click", closeLetter);
// Clicar fora da carta (no fundo escurecido) fecha-a
letter.addEventListener("click", (e) => {
  if (e.target !== letter) return;
  const r = letter.getBoundingClientRect();
  const outside = e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
  if (outside) closeLetter();
});
// Esc: usa a mesma animação de saída
letter.addEventListener("cancel", (e) => { e.preventDefault(); closeLetter(); });
letter.addEventListener("close", () => document.body.classList.remove("letter-open"));

/* ================= SCROLL EFFECTS ================= */
const timeline = document.getElementById("timeline");
const progress = document.getElementById("timelineProgress");

function onScroll() {
  nav.classList.toggle("scrolled", window.scrollY > 30);

  // linha do percurso vai-se preenchendo com o scroll
  const r = timeline.getBoundingClientRect();
  const vh = window.innerHeight;
  const p = Math.min(Math.max((vh * 0.6 - r.top) / r.height, 0), 1);
  progress.style.height = `${p * 100}%`;

  // link ativo
  let current = -1;
  sections.forEach((s, i) => { if (s.getBoundingClientRect().top < vh * 0.4) current = i; });
  navLinks.forEach((a, i) => a.classList.toggle("active", i === current));
}
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

/* ================= POINTER EFFECTS (desktop) ================= */
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

if (finePointer && !reduceMotion) {
  const glow = document.getElementById("cursorGlow");
  let gx = innerWidth / 2, gy = innerHeight / 2, tx = gx, ty = gy;
  window.addEventListener("mousemove", (e) => { tx = e.clientX; ty = e.clientY; });
  (function loop() {
    gx += (tx - gx) * 0.12; gy += (ty - gy) * 0.12;
    glow.style.transform = `translate(${gx}px, ${gy}px)`;
    requestAnimationFrame(loop);
  })();

  // Inclinação 3D da foto
  const tilt = document.getElementById("tilt");
  const frame = tilt.querySelector(".photo-frame");
  tilt.addEventListener("mousemove", (e) => {
    const r = tilt.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    frame.style.transform = `perspective(900px) rotateY(${x * 14}deg) rotateX(${-y * 14}deg)`;
  });
  tilt.addEventListener("mouseleave", () => { frame.style.transform = ""; });

  // Botões magnéticos
  document.querySelectorAll(".magnetic").forEach((el) => {
    el.addEventListener("mousemove", (e) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2;
      const y = e.clientY - r.top - r.height / 2;
      el.style.transform = `translate(${x * 0.2}px, ${y * 0.3}px)`;
    });
    el.addEventListener("mouseleave", () => { el.style.transform = ""; });
  });

  // Brilho que segue o rato nos cartões de competências
  document.querySelectorAll(".skill-card").forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${e.clientX - r.left}px`);
      card.style.setProperty("--my", `${e.clientY - r.top}px`);
    });
  });
}

/* ================= BACKGROUND NETWORK ================= */
const canvas = document.getElementById("bg");
const ctx = canvas.getContext("2d");
let W, H, points = [];
const mouse = { x: -9999, y: -9999 };

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = canvas.width = innerWidth * dpr;
  H = canvas.height = innerHeight * dpr;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);
  const count = Math.min(Math.floor((innerWidth * innerHeight) / 18000), 90);
  points = Array.from({ length: count }, () => ({
    x: Math.random() * innerWidth,
    y: Math.random() * innerHeight,
    vx: (Math.random() - 0.5) * 0.3,
    vy: (Math.random() - 0.5) * 0.3,
  }));
}
window.addEventListener("resize", resize);
window.addEventListener("mousemove", (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });
resize();

function draw() {
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  const maxD = 130;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    p.x += p.vx; p.y += p.vy;
    if (p.x < 0 || p.x > innerWidth) p.vx *= -1;
    if (p.y < 0 || p.y > innerHeight) p.vy *= -1;

    ctx.fillStyle = "rgba(255, 59, 82, 0.5)";
    ctx.beginPath(); ctx.arc(p.x, p.y, 1.4, 0, Math.PI * 2); ctx.fill();

    for (let j = i + 1; j < points.length; j++) {
      const q = points[j];
      const d = Math.hypot(p.x - q.x, p.y - q.y);
      if (d < maxD) {
        ctx.strokeStyle = `rgba(196, 22, 44, ${0.18 * (1 - d / maxD)})`;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
      }
    }
    const dm = Math.hypot(p.x - mouse.x, p.y - mouse.y);
    if (dm < 180) {
      ctx.strokeStyle = `rgba(255, 59, 82, ${0.35 * (1 - dm / 180)})`;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
    }
  }
  requestAnimationFrame(draw);
}
if (!reduceMotion) draw();

document.getElementById("year").textContent = new Date().getFullYear();
