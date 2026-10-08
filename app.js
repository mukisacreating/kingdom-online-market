(function () {
  const IMG = window.KOM_IMG || {};
  const D = window.KOM;
  const $ = (sel, el = document) => el.querySelector(sel);
  const app = document.getElementById("app");

  const store = {
    get(key, fallback) {
      try {
        return JSON.parse(localStorage.getItem(key)) ?? fallback;
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      localStorage.setItem(key, JSON.stringify(value));
    },
  };

  function extraListings() {
    return store.get("kom-extra", { businesses: [], products: [] });
  }
  function extraChurches() {
    return store.get("kom-churches-extra", []);
  }
  function churches() {
    return (D.churches || []).concat(extraChurches());
  }
  function currentChurchId() {
    return store.get("kom-church-id", null);
  }
  function church() {
    const id = currentChurchId();
    return churches().find((c) => c.id === id) || null;
  }
  function session() {
    return store.get("kom-session", null);
  }
  function members() {
    const saved = store.get("kom-members", null);
    if (saved) return saved;
    const initial = [];
    for (const b of D.businesses) {
      initial.push({
        id: "m-" + b.id,
        name: b.owner,
        email: b.id + "@kingdom.church",
        phone: b.phone,
        churchId: b.church,
        ministry: "Sunday congregation",
        role: "member",
        status: "approved",
        canPost: true,
      });
    }
    for (const c of churches()) {
      initial.push({
        id: "admin-" + c.id,
        name: c.adminName,
        email: "admin@" + c.id + ".church",
        phone: c.phone,
        churchId: c.id,
        ministry: "Sunday congregation",
        role: "admin",
        status: "approved",
        canPost: true,
      });
    }
    initial.push({
      id: "pending-demo",
      name: "Alice Namukasa",
      email: "alice@fellowship.ug",
      phone: "+256 700 221 009",
      churchId: "kfk",
      ministry: "Youth",
      role: "pending",
      status: "pending",
      canPost: false,
    });
    store.set("kom-members", initial);
    return initial;
  }
  function inChurch(item) {
    const id = currentChurchId();
    if (!id) return false;
    return item.church === id;
  }
  function businesses() {
    return D.businesses.concat(extraListings().businesses).filter(inChurch);
  }
  function products() {
    return D.products.concat(extraListings().products).filter(inChurch);
  }
  function services() {
    return (D.services || []).filter(inChurch);
  }
  function courses() {
    return (D.courses || []).filter(inChurch);
  }
  function ideas() {
    const list = store.get("kom-ideas", D.ideas);
    return list.filter(inChurch);
  }
  function canPost() {
    const s = session();
    const c = currentChurchId();
    if (!s || !c) return false;
    if (s.status !== "approved") return false;
    if (s.churchId !== c) return false;
    return s.role === "admin" || s.role === "member" || s.canPost;
  }
  function isAdmin() {
    const s = session();
    const c = currentChurchId();
    return !!(s && c && s.role === "admin" && s.churchId === c && s.status === "approved");
  }
  function photoHero(key, kicker, title, lede, extra) {
    return `<section class="discover">
      <div>
        <p class="kicker">${kicker}</p>
        <h1>${title}</h1>
        ${lede ? `<p class="lede">${lede}</p>` : ""}
        ${extra || ""}
      </div>
      <img src="img/heroes/${key}.jpg" alt="" />
    </section>`;
  }

  function ugx(n) {
    return "UGX " + Number(n || 0).toLocaleString("en-UG");
  }
  function esc(s) {
    const map = { "&": "&" + "amp;", "<": "&" + "lt;", ">": "&" + "gt;", '"': "&" + "quot;" };
    return String(s ?? "").replace(/[&<>"]/g, (ch) => map[ch]);
  }
  function photo(key, alt) {
    const src = IMG[key];
    if (!src) {
      return `<div class="face" aria-hidden="true">${esc((alt || "?").slice(0, 1))}</div>`;
    }
    return `<img src="${src}" alt="${esc(alt || "")}" />`;
  }
  function face(key, name, cls) {
    const src = IMG[key];
    if (!src) return `<span class="face ${cls || ""}">${esc((name || "?").slice(0, 1))}</span>`;
    return `<img class="face ${cls || ""}" src="${src}" alt="${esc(name)}" />`;
  }
  function stars(n) {
    const full = Math.round(n);
    return `<span class="stars" aria-label="${n} of 5">${"★".repeat(full)}${"☆".repeat(5 - full)}</span>`;
  }
  function catName(slug) {
    return (D.categories.find((c) => c.slug === slug) || { name: slug }).name;
  }
  function bizById(id) {
    return businesses().find((b) => b.id === id);
  }
  function cart() {
    return store.get("kom-cart", []);
  }
  function cartCount() {
    return cart().reduce((n, i) => n + i.qty, 0);
  }
  function cartTotal() {
    return cart().reduce((n, i) => n + i.price * i.qty, 0);
  }
  function addCart(p) {
    const items = cart();
    const hit = items.find((i) => i.id === p.id);
    if (hit) hit.qty += 1;
    else
      items.push({
        id: p.id,
        slug: p.slug,
        name: p.name,
        price: p.price,
        img: p.img,
        biz: p.biz,
        qty: 1,
      });
    store.set("kom-cart", items);
    toast("Added to cart");
    render();
  }
  function toast(msg) {
    let t = document.getElementById("toast");
    if (!t) {
      t = document.createElement("div");
      t.id = "toast";
      t.style.cssText =
        "position:fixed;bottom:5rem;right:1rem;z-index:80;background:#161410;color:#f3efe6;padding:.75rem 1rem;border-radius:8px;font-size:.875rem";
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.display = "block";
    clearTimeout(toast._t);
    toast._t = setTimeout(() => (t.style.display = "none"), 2200);
  }

  function route() {
    const raw = (location.hash.slice(1) || "/").replace(/^\/+/, "/");
    const [pathPart, qs] = raw.split("?");
    const params = new URLSearchParams(qs || "");
    const parts = pathPart.split("/").filter(Boolean);
    return { path: "/" + parts.join("/"), parts, params };
  }
  function go(hash) {
    location.hash = hash.startsWith("#") ? hash : "#" + hash;
  }
  function on(path) {
    const r = route();
    if (path === "/") return r.path === "/";
    return r.path === path || r.path.startsWith(path + "/");
  }

  const crown = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true"><path d="M3.5 18.5h17M4 18.5 6.2 8.8l5.8 5.4 5.8-5.4L20 18.5H4Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="6.2" cy="7.2" r="1.35" fill="currentColor"/><circle cx="12" cy="12.2" r="1.35" fill="currentColor"/><circle cx="17.8" cy="7.2" r="1.35" fill="currentColor"/></svg>`;

  function shell(inner) {
    const r = route();
    const ch = church();
    const s = session();
    const hello = (s && s.name ? s.name.split(" ")[0] : "friend");
    const today = new Date().toLocaleDateString("en-UG", { day: "numeric", month: "long" });
    const homeOn = r.path === "/";
    return `
      <header class="greet">
        <a href="#/account"><img class="avatar" src="img/members/nakato.jpg" alt="" /></a>
        <div style="flex:1;min-width:0">
          <h1>Hi, ${esc(hello)}</h1>
          <p class="muted" style="margin:.35rem 0 0;font-size:.9rem">${esc(today)}${ch ? " · " + esc(ch.short) : ""}</p>
        </div>
        <a class="round" href="#/walls" aria-label="Search">⌕</a>
        <button class="round" id="themeBtn" type="button" aria-label="Toggle dark mode">◐</button>
      </header>
      <main>${inner}</main>
      <nav class="dock" aria-label="Primary">
        <a class="${homeOn ? "on" : ""}" href="#/">Home</a>
        <a class="${on("/walls") ? "on" : ""}" href="#/walls">Walls</a>
        <a class="${on("/learn") ? "on" : ""}" href="#/learn">Learn</a>
        <a class="${on("/cart") ? "on" : ""}" href="#/cart">Cart${cartCount() ? " " + cartCount() : ""}</a>
        <a class="${on("/account") || on("/login") ? "on" : ""}" href="${s ? "#/account" : "#/login"}">You</a>
      </nav>
      <footer class="foot">
        <div class="wrap foot-grid">
          <div>
            <a class="logo" href="#/"><span class="mark">${crown}</span><span><strong>Kingdom</strong><small>Online Market</small></span></a>
            <p class="muted" style="margin-top:1rem;max-width:20rem;line-height:1.6;font-size:.9rem">A marketplace for the church family. Light and dark, the same walls.</p>
            <div class="payrow" style="padding-left:0">${payMarks()}</div>
          </div>
          <div>
            <p class="meta">Inside the walls</p>
            <p><a href="#/churches">Choose a church market</a></p>
            <p><a href="#/walls">Businesses and products</a></p>
            <p><a href="#/post">Post what you do</a></p>
            <p><a href="#/connect">Find a skill</a></p>
          </div>
          <div>
            <p class="meta">Grow</p>
            <p><a href="#/learn">Kingdom Learn</a></p>
            <p><a href="#/ideas">Business ideas</a></p>
            <p><a href="#/join">Join this church</a></p>
            ${isAdmin() ? `<p><a href="#/admin">Administrator desk</a></p>` : ""}
          </div>
        </div>
        <p class="subtle" style="text-align:center;border-top:1px solid var(--border);padding:1rem;margin:2rem 0 0">KINGDOM ONLINE MARKET · Inside the Kingdom Walls · Buy. Sell. Learn. Connect. Build.</p>
      </footer>
    `;
  }

  function payMarks() {
    const marks = [
      ["UGX", "#17141c", "#fff", "Cash"],
      ["Mo", "#ffcb05", "#1a1a1a", "MTN MoMo"],
      ["A", "#ed1c24", "#fff", "Airtel Money"],
      ["VISA", "#1a1f71", "#fff", "Card"],
      ["BK", "#0f6b4c", "#fff", "Bank"],
    ];
    return marks
      .map(
        ([letters, bg, fg, name]) =>
          `<span class="marklet" style="background:${bg};color:${fg}" title="${name}">${letters}</span>`,
      )
      .join("");
  }

  function navLinks(mobile) {
    const items = [
      ["#/", "Home", "/"],
      ["#/walls", "Inside the Kingdom Walls", "/walls"],
      ["#/churches", "Churches", "/churches"],
      ["#/ideas", "Business Ideas", "/ideas"],
      ["#/learn", "Kingdom Learn", "/learn"],
      ["#/connect", "Connect", "/connect"],
    ];
    const links = items.map(([href, label, path]) => {
      const a = `<a class="${on(path) ? "on" : ""}" href="${href}">${label}</a>`;
      return mobile ? a : `<li>${a}</li>`;
    });
    if (mobile) {
      links.push(`<a href="#/join">Join this church</a>`);
      links.push(canPost() ? `<a href="#/post">Post what you do</a>` : `<a href="#/login">Sign in</a>`);
      links.push(`<a href="#/account">Account</a>`);
      if (isAdmin()) links.push(`<a href="#/admin">Administrator desk</a>`);
    }
    return links.join("");
  }

  function productCard(p) {
    const b = bizById(p.biz);
    const deal = p.compare && p.compare > p.price;
    return `<a class="card" href="#/p/${p.slug}">
      <div class="ph">${p.badge ? `<span class="pill ${deal || p.badge === "Deal" ? "deal" : ""}">${esc(p.badge)}</span>` : ""}${photo(p.img, p.name)}</div>
      <div class="body">
        <p class="meta">${esc(b ? b.name : "")}</p>
        <h3>${esc(p.name)}</h3>
        <div>${stars(p.rating)} <span class="subtle">${esc(b ? b.city : "")}</span></div>
        <p class="price">${ugx(p.price)}${deal ? `<span class="old">${ugx(p.compare)}</span>` : ""}${p.ship === "delivery" && p.mins ? `<span class="subtle" style="float:right;color:var(--primary)">${p.mins} min</span>` : ""}</p>
      </div>
    </a>`;
  }

  function bizCard(b) {
    return `<article class="biz">
      <div class="who">
        ${face(b.photo, b.owner)}
        <div>
          <h3>${esc(b.name)} ${b.verified ? `<span class="pill" style="position:static">Verified</span>` : ""}</h3>
          <p class="muted" style="margin:.25rem 0 0;font-size:.875rem">${esc(b.owner)}</p>
          <p class="subtle">${esc(catName(b.cat))} · ${esc(b.city)}</p>
        </div>
      </div>
      <p class="muted" style="font-size:.9rem;line-height:1.5">${esc(b.tagline)}</p>
      <div>${stars(b.rating)} <span class="subtle">${b.reviews} reviews</span></div>
      <div class="row">
        <a class="btn sm" href="#/b/${b.slug}">View business</a>
        <a class="btn sm outline" href="#/b/${b.slug}">Shop</a>
        <a class="btn sm ghost" href="tel:${esc(b.phone.replace(/\s/g, ""))}">Contact</a>
      </div>
    </article>`;
  }

  function home() {
    const ch = church();
    const feat = products().slice().sort((a, b) => b.rating - a.rating).slice(0, 8);
    const deals = products().filter((p) => p.compare);
    const news = products().slice().reverse().slice(0, 6);
    const grocery = products().filter((p) => p.ship === "delivery").slice(0, 6);
    return `
      ${photoHero(
        "home",
        ch ? esc(ch.name) : "Welcome to Kingdom Online Market",
        "Inside the Kingdom Walls",
        "A marketplace for the church family. Members sell to one another, buy from people they already know and trust, and learn how to start and grow a business.",
        `<div class="cta">
            <a class="btn lg" href="#/walls">Start shopping</a>
            <a class="btn lg outline" href="#/walls?kind=businesses">Explore Kingdom businesses</a>
            <a class="btn lg ghost" href="${canPost() ? "#/post" : "#/join"}">${canPost() ? "Start a business" : "Join this church"}</a>
          </div>`,
      )}
      <section class="section wrap">
        <ul class="notes" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr))">
          ${[
            ["Buy", "Shop the stalls of this church."],
            ["Sell", "Post what you do once the administrator welcomes you."],
            ["Learn", "Practical skills to start and grow a shop."],
            ["Connect", "Meet the baker, tailor, driver, designer."],
            ["Build", "Share ideas. Find partners inside the church."],
          ]
            .map(([t, b]) => `<li class="note"><i>${t[0]}</i><span><b>${t}</b><span class="muted" style="display:block;margin-top:.25rem;font-size:.875rem">${b}</span></span></li>`)
            .join("")}
        </ul>
      </section>
      <section class="section wrap">
        <div class="head"><h2>Popular categories</h2><a href="#/walls">See all</a></div>
        <div class="cats">${D.categories.map((c) => `<a class="cat" href="#/walls?category=${c.slug}"><b>${esc(c.name)}</b><span>${esc(c.blurb)}</span></a>`).join("")}</div>
      </section>
      <section class="section wrap">
        <div class="head"><h2>Featured businesses</h2><a href="#/walls?kind=businesses">All businesses</a></div>
        <div class="grid-2">${businesses().slice(0, 4).map(bizCard).join("") || "<p class='empty'>This church has not opened stalls yet.</p>"}</div>
      </section>
      <section class="section wrap">
        <div class="head"><h2>Special offers</h2><a href="#/walls">Shop offers</a></div>
        <div class="grid-p">${deals.map(productCard).join("") || "<p class='empty'>No offers on these walls today.</p>"}</div>
      </section>
      <section class="section wrap">
        <div class="head"><h2>Featured products</h2><a href="#/walls">Inside the walls</a></div>
        <div class="grid-p">${feat.map(productCard).join("")}</div>
      </section>
      <section class="section wrap">
        <div class="head"><h2>New businesses</h2><a href="#/walls?kind=businesses">Directory</a></div>
        <div class="grid-2" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr))">
          ${businesses()
            .map(
              (b) => `<a class="who" href="#/b/${b.slug}" style="background:var(--surface);padding:1rem;border-radius:16px;border:1px solid var(--border)">${face(b.photo, b.owner)}<span><b style="font-family:var(--font-display);font-size:1.1rem">${esc(b.name)}</b><span class="subtle" style="display:block">${esc(b.city)} · ${esc(catName(b.cat))}</span></span></a>`
            )
            .join("")}
        </div>
      </section>
      <section class="section wrap">
        <div class="head"><h2>New products</h2><a href="#/walls">See updates</a></div>
        <div class="grid-p">${news.map(productCard).join("")}</div>
      </section>
      <section class="section wrap">
        <div class="head"><h2>Popular services</h2><a href="#/connect">Find a person</a></div>
        <div class="grid-2">${services()
          .map((s) => {
            const b = bizById(s.biz);
            if (!b) return "";
            return `<a href="#/b/${b.slug}" class="biz"><p class="meta">${esc(b.city)}</p><h3>${esc(s.name)}</h3><p class="muted">${esc(b.owner)} · ${esc(b.name)}</p><p style="color:var(--primary);font-weight:500">${esc(s.price)}</p></a>`;
          })
          .join("")}</div>
        <div class="grid-p">${grocery.map(productCard).join("")}</div>
      </section>
      <section class="section wrap">
        <div class="head"><h2>Kingdom Learn</h2><a href="#/learn">All courses</a></div>
        <div class="grid-p">${courses()
          .slice(0, 4)
          .map(
            (c) => `<a class="card" href="#/learn/${c.slug}"><div class="ph">${photo(c.img, c.title)}</div><div class="body"><p class="meta">${esc(c.cat)}</p><h3>${esc(c.title)}</h3><p class="muted">${esc(c.instructor)}</p><p class="price">${c.price ? ugx(c.price) : "Free"}</p></div></a>`
          )
          .join("") || "<p class='empty'>This church has not posted a course yet.</p>"}</div>
      </section>
      <section class="section wrap">
        <div class="head"><h2>Latest business ideas</h2><a href="#/ideas">Join the talk</a></div>
        <div class="grid-2" style="grid-template-columns:repeat(auto-fit,minmax(240px,1fr))">${ideas()
          .slice(0, 3)
          .map((i) => `<a class="biz" href="#/ideas/${i.id}"><span class="pill" style="position:static">${esc((D.intents.find((x) => x.slug === i.intent) || {}).name || i.intent)}</span><h3 style="margin-top:.75rem">${esc(i.title)}</h3><p class="muted" style="margin-top:.5rem">${esc(i.body)}</p><p class="subtle" style="margin-top:1rem">${esc(i.author)} · ${i.likes} standing with this</p></a>`)
          .join("") || "<p class='empty'>No ideas on these walls yet.</p>"}</div>
      </section>
    `;
  }

  function walls() {
    const ch = church();
    const r = route();
    const q = (r.params.get("q") || "").toLowerCase();
    const cat = r.params.get("category") || "";
    const city = r.params.get("city") || "";
    const kind = r.params.get("kind") || "all";
    let ps = products();
    let bs = businesses();
    let ss = services().slice();
    if (q) {
      ps = ps.filter((p) => (p.name + p.desc + (bizById(p.biz) || {}).name).toLowerCase().includes(q));
      bs = bs.filter((b) => (b.name + b.tagline + b.about + b.owner).toLowerCase().includes(q));
      ss = ss.filter((s) => (s.name + s.desc).toLowerCase().includes(q));
    }
    if (cat) {
      ps = ps.filter((p) => p.cat === cat);
      bs = bs.filter((b) => b.cat === cat);
      ss = ss.filter((s) => s.cat === cat);
    }
    if (city) {
      ps = ps.filter((p) => (bizById(p.biz) || {}).city === city);
      bs = bs.filter((b) => b.city === city);
      ss = ss.filter((s) => (bizById(s.biz) || {}).city === city);
    }
    const sort = r.params.get("sort");
    if (sort === "price-asc") ps.sort((a, b) => a.price - b.price);
    if (sort === "price-desc") ps.sort((a, b) => b.price - a.price);
    function tab(k, label) {
      return `<a class="tab ${kind === k ? "on" : ""}" href="#/walls?kind=${k}${cat ? "&category=" + cat : ""}${city ? "&city=" + city : ""}${q ? "&q=" + encodeURIComponent(q) : ""}">${label}</a>`;
    }
    return `
      ${photoHero(
        "walls",
        ch ? esc(ch.name) : "The stall of the fellowship",
        "Inside the Kingdom Walls",
        ch
          ? `Discover what members of ${esc(ch.name)} are building, selling and offering. You are looking only at this church’s Kingdom Market.`
          : "Discover what our Kingdom members are building, selling and offering.",
      )}
      <div class="wrap" style="padding-top:1.5rem">
        <form class="filters" id="wallForm">
          <input name="q" value="${esc(r.params.get("q") || "")}" placeholder="Business, product, service, or member" />
          <select name="category"><option value="">All categories</option>${D.categories.map((c) => `<option value="${c.slug}" ${cat === c.slug ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select>
          <select name="city"><option value="">All towns</option>${D.cities.map((c) => `<option ${city === c ? "selected" : ""}>${c}</option>`).join("")}</select>
          <button class="btn" type="submit">Search</button>
        </form>
        <div class="tabs">${tab("all", "All")}${tab("businesses", "Businesses")}${tab("products", "Products")}${tab("services", "Services")}
          <a class="tab" href="#/walls?sort=new">Newest</a>
          <a class="tab" href="#/walls?sort=price-asc">Price ↑</a>
          <a class="tab" href="#/walls?sort=price-desc">Price ↓</a>
        </div>
        ${kind !== "products" && kind !== "services" ? `<h2>Businesses</h2><div class="grid-2">${bs.map(bizCard).join("") || "<p class='empty'>Nothing on the walls matches that yet.</p>"}</div>` : ""}
        ${kind !== "businesses" && kind !== "services" ? `<h2 style="margin-top:2rem">Products</h2><div class="grid-p">${ps.map(productCard).join("") || "<p class='empty'>Nothing on the walls matches that yet.</p>"}</div>` : ""}
        ${kind !== "products" && kind !== "businesses" ? `<h2 style="margin-top:2rem">Services</h2><div class="grid-2">${ss
          .map((s) => {
            const b = bizById(s.biz);
            return `<a class="who" href="#/b/${b.slug}" style="background:var(--surface);padding:1rem;border-radius:16px;border:1px solid var(--border)">${face(b.photo, b.owner)}<span><b style="font-family:var(--font-display);font-size:1.2rem">${esc(s.name)}</b><span class="muted" style="display:block">${esc(b.owner)} · ${esc(b.city)}</span><span style="color:var(--primary)">${esc(s.price)}</span></span></a>`;
          })
          .join("")}</div>` : ""}
      </div>
    `;
  }

  function productPage(slug) {
    const p = products().find((x) => x.slug === slug);
    if (!p) return `<p class="wrap empty">That listing is no longer on the walls.</p>`;
    const b = bizById(p.biz);
    const related = products().filter((x) => x.cat === p.cat && x.id !== p.id).slice(0, 4);
    const revs = D.reviews[p.id] || [];
    const deal = p.compare && p.compare > p.price;
    return `<div class="wrap product">
      <div class="gallery">${photo(p.img, p.name)}</div>
      <div>
        <p class="meta">${esc(catName(p.cat))}</p>
        <h1 style="font-size:2.2rem;margin-top:.5rem">${esc(p.name)}</h1>
        <div class="row" style="margin-top:.75rem">${stars(p.rating)} <span class="muted">${p.reviews} reviews</span> ${p.badge ? `<span class="pill ${deal ? "deal" : ""}" style="position:static">${esc(p.badge)}</span>` : ""}</div>
        <p style="font-family:var(--font-display);font-size:1.8rem;margin:1.25rem 0">${ugx(p.price)}${deal ? `<span class="old">${ugx(p.compare)}</span>` : ""}</p>
        <p class="muted" style="line-height:1.6">${esc(p.desc)}</p>
        <a class="who" href="#/b/${b.slug}" style="margin:1.5rem 0;background:var(--surface);padding:.75rem;border-radius:12px;border:1px solid var(--border)">${face(b.photo, b.owner)}<span><b>${esc(b.name)}</b><span class="subtle" style="display:block">${esc(b.owner)} · ${esc(b.city)}${b.verified ? " · Verified Kingdom member" : ""}</span></span></a>
        <p class="muted">${p.ship === "delivery" && p.mins ? `Often at your gate in about ${p.mins} minutes.` : "Ships from the member in a few days. Sunday church pickup if you ask."}</p>
        <p class="muted">${p.stock} in reach</p>
        <div class="row" style="margin-top:1.5rem">
          <button class="btn lg" data-add="${p.id}">Add to cart</button>
          <button class="btn lg deal" data-buy="${p.id}">Buy now</button>
          <a class="btn lg outline" href="#/b/${b.slug}">Message seller</a>
        </div>
        ${revs.length ? `<div style="margin-top:2rem">${revs.map((rv) => `<p><b>${esc(rv.a)}</b> ${stars(rv.r)}<br><span class="muted">${esc(rv.b)}</span></p>`).join("")}</div>` : ""}
      </div>
    </div>
    <div class="wrap section"><div class="head"><h2>Related</h2></div><div class="grid-p">${related.map(productCard).join("")}</div></div>`;
  }

  function businessPage(slug) {
    const b = businesses().find((x) => x.slug === slug);
    if (!b) return `<p class="wrap empty">That stall is not on the walls yet.</p>`;
    const ps = products().filter((p) => p.biz === b.id);
    const ss = D.services.filter((s) => s.biz === b.id);
    const revs = D.reviews[b.id] || [];
    return `
      <div class="cover">${photo(b.cover, b.name)}</div>
      <div class="wrap">
        <div class="biz-hero">
          ${face(b.photo, b.owner, "")}
          <div>
            <h1 style="font-size:2.4rem">${esc(b.name)} ${b.verified ? `<span class="pill" style="position:static">Verified Kingdom Business</span>` : ""}</h1>
            <p class="muted">${esc(b.owner)} · ${esc(catName(b.cat))}</p>
            <p class="subtle">${esc(b.city)} · ${esc(b.hours)}</p>
            <div>${stars(b.rating)} <span class="muted">${b.reviews} reviews</span></div>
          </div>
        </div>
        <div class="row" style="margin-bottom:2rem">
          <button class="btn" data-toast="Following this stall">Follow</button>
          <a class="btn outline" href="tel:${esc(b.phone.replace(/\s/g, ""))}">Contact</a>
          <a class="btn ghost" href="#/walls">Shop products</a>
        </div>
        <p class="lede">${esc(b.about)}</p>
        <p class="muted">Delivery: ${esc(b.delivery)}</p>
        <h2 style="margin:2rem 0 1rem">Products</h2>
        <div class="grid-p">${ps.map(productCard).join("") || "<p class='empty'>No products yet.</p>"}</div>
        ${ss.length ? `<h2 style="margin:2rem 0 1rem">Services</h2><div class="grid-2">${ss.map((s) => `<div class="biz"><h3>${esc(s.name)}</h3><p class="muted">${esc(s.desc)}</p><p style="color:var(--primary)">${esc(s.price)}</p></div>`).join("")}</div>` : ""}
        ${revs.length ? `<h2 style="margin:2rem 0 1rem">Reviews</h2>${revs.map((rv) => `<p><b>${esc(rv.a)}</b> ${stars(rv.r)}<br><span class="muted">${esc(rv.b)}</span></p>`).join("")}` : ""}
      </div>`;
  }

  function postPage() {
    const ch = church();
    if (!session()) {
      return (
        photoHero("post", "Members only", "Sign in before you post", "An administrator must know you before a stall goes on these walls.") +
        `<div class="wrap" style="padding:2rem 1rem 4rem"><a class="btn lg" href="#/login">Sign in</a> <a class="btn lg outline" href="#/join">Ask to join</a></div>`
      );
    }
    if (!canPost()) {
      return (
        photoHero(
          "post",
          "Waiting for welcome",
          "Your administrator will open the stall",
          session().status === "pending"
            ? "Thank you. Your request is with the church administrator. You will be able to post when they approve you."
            : "Join this church first. Permission to post is given by the administrator of this Kingdom Market.",
        ) + `<div class="wrap" style="padding:2rem 1rem 4rem"><a class="btn lg" href="#/join">Join ${esc(ch ? ch.name : "this church")}</a></div>`
      );
    }
    return `${photoHero("post", "For members with work in their hands", "Post what you do", `Name the work, the town, and the first thing you sell. It appears on Inside the Kingdom Walls for ${esc(ch ? ch.name : "the fellowship")} to find.`)}
      <form class="wrap form" id="postForm" style="padding:2rem 1rem 4rem">
        <label><span>Your name</span><input name="owner" required placeholder="Name as the church knows you" value="${esc(session().name || "")}" /></label>
        <label><span>Business or stall name</span><input name="name" required /></label>
        <label><span>Category</span><select name="cat">${D.categories.map((c) => `<option value="${c.slug}">${esc(c.name)}</option>`).join("")}</select></label>
        <label><span>Town</span><select name="city">${D.cities.map((c) => `<option>${c}</option>`).join("")}</select></label>
        <label><span>Phone</span><input name="phone" placeholder="+256 7…" value="${esc(session().phone || "")}" /></label>
        <label><span>One-line tagline</span><input name="tagline" placeholder="What you are known for" /></label>
        <label><span>About the work</span><textarea name="about"></textarea></label>
        <label><span>First product or service</span><input name="product" required /></label>
        <label><span>Price in UGX</span><input name="price" type="number" min="0" required /></label>
        <label><span>What it is</span><textarea name="desc"></textarea></label>
        <button class="btn lg" type="submit">Put it on the walls</button>
      </form>`;
  }

  function cartPage() {
    const items = cart();
    if (!items.length) return `${photoHero("cart", "Your basket", "Your cart", "Nothing here yet. Walk the walls of this church.")}<div class="wrap" style="padding:0 1rem 4rem"><a class="btn" href="#/walls">Inside the Kingdom Walls</a></div>`;
    return `${photoHero("cart", "Your basket", "Your cart", "These stalls belong to members of this church.")}
      <div class="wrap" style="display:grid;gap:.75rem;padding:1.5rem 1rem 4rem;max-width:40rem">
        ${items
          .map(
            (i) => `<div class="cart-line">${photo(i.img, i.name)}<div><b>${esc(i.name)}</b><p class="subtle">${esc((bizById(i.biz) || {}).name || "")}</p><p class="price">${ugx(i.price)}</p></div><div><input class="qty" type="number" min="1" value="${i.qty}" data-qty="${i.id}" /><button class="btn ghost sm" data-rm="${i.id}">Remove</button></div></div>`
          )
          .join("")}
        <p>Subtotal <b style="float:right">${ugx(cartTotal())}</b></p>
        <p class="muted">Delivery is agreed with the member — often a boda, a van, or Sunday pickup.</p>
        <p>Total <b style="float:right">${ugx(cartTotal())}</b></p>
        <a class="btn lg" href="#/checkout">Proceed to checkout</a>
      </div>`;
  }

  function checkoutPage() {
    if (!cart().length) return cartPage();
    return `${photoHero("cart", "Checkout", "Place the order with the member", "Cash on delivery, mobile money, card, or bank — no secrets stored here. This demo keeps the order on this device.")}
      <form class="wrap form" id="checkForm" style="padding:2rem 1rem 4rem">
        <label><span>Your name</span><input name="customerName" required /></label>
        <label><span>Phone</span><input name="phone" required /></label>
        <label><span>Town</span><select name="city">${D.cities.map((c) => `<option>${c}</option>`).join("")}</select></label>
        <label><span>Delivery address or church pickup note</span><textarea name="address" required></textarea></label>
        <label><span>How it should arrive</span>
          <select name="deliveryMethod"><option value="boda">Boda / same day</option><option value="pickup">Sunday church pickup</option><option value="van">Van / scheduled</option></select>
        </label>
        <label><span>Payment</span>
          <select name="payMethod"><option value="cod">Cash on delivery</option><option value="momo">Mobile money (later)</option><option value="card">Card (later)</option><option value="bank">Bank (later)</option></select>
        </label>
        <p>Total <b>${ugx(cartTotal())}</b></p>
        <button class="btn lg" type="submit">Confirm order</button>
      </form>`;
  }

  function ordersPage() {
    const orders = store.get("kom-orders", []);
    return `${photoHero("cart", "Orders", "Orders", "Track what you asked this church to send.")}
      <div class="wrap" style="padding:1.5rem 1rem 4rem;display:grid;gap:1rem">
        ${
          orders.length
            ? orders
                .map(
                  (o) => `<div class="biz"><p class="meta">${esc(o.id)} · ${esc(o.status)}</p><p>${esc(o.customerName)} · ${esc(o.city)}</p><p>${o.items.map((i) => esc(i.name) + " × " + i.qty).join(", ")}</p><p class="price">${ugx(o.total)}</p><p class="subtle">${esc(o.payMethod)} · ${esc(o.deliveryMethod)}</p></div>`
                )
                .join("")
            : "<p class='empty'>No orders on this device yet.</p>"
        }
      </div>`;
  }

  function learnPage() {
    return `${photoHero("learn", "Kingdom Learn", "Learn practical skills. Start businesses. Grow your future.", "Baking, tailoring, poultry, books, hair, selling on a phone. Taught by members of this church who already do the work.")}
      <div class="wrap grid-p" style="padding:2rem 1rem 4rem">${courses()
        .map(
          (c) => `<a class="card" href="#/learn/${c.slug}"><div class="ph">${photo(c.img, c.title)}</div><div class="body"><p class="meta">${esc(c.cat)} · ${esc(c.level)}</p><h3>${esc(c.title)}</h3><div class="who" style="align-items:center">${face(c.photo, c.instructor)}<span class="muted">${esc(c.instructor)}</span></div><p class="muted">${esc(c.desc)}</p><p>${stars(c.rating)} <span class="subtle">${c.lessons} lessons · ${esc(c.duration)}</span> <b style="float:right">${c.price ? ugx(c.price) : "Free"}</b></p></div></a>`
        )
        .join("") || "<p class='empty'>This church has not posted a course yet. Ask the administrator.</p>"}</div>`;
  }

  function coursePage(slug) {
    const c = courses().find((x) => x.slug === slug) || D.courses.find((x) => x.slug === slug);
    if (!c) return `<p class="wrap empty">Course not found.</p>`;
    const done = store.get("kom-lessons", {});
    return `${photoHero("learn", esc(c.cat), esc(c.title), esc(c.desc))}
    <div class="wrap" style="padding:0 1rem 4rem;max-width:44rem">
      <div class="who" style="margin-bottom:1.5rem">${face(c.photo, c.instructor)}<span>${esc(c.instructor)} · ${esc(c.duration)} · ${esc(c.level)}</span></div>
      <p class="price">${c.price ? ugx(c.price) : "Free for members"}</p>
      ${(c.units || [])
        .map(
          (u, i) => `<article class="biz"><h3>Lesson ${i + 1}. ${esc(u.t)}</h3><p class="subtle">${u.m} min</p><p class="muted">${esc(u.b)}</p><button class="btn sm" data-lesson="${c.id}:${i}">${done[c.id + ":" + i] ? "Completed" : "Mark complete"}</button></article>`
        )
        .join("")}
    </div>`;
  }

  function ideasPage() {
    const r = route();
    const intent = r.params.get("intent") || "";
    let list = ideas();
    if (intent) list = list.filter((i) => i.intent === intent);
    return `${photoHero("ideas", "Kingdom Business Ideas", "Share what you want to build", "Poultry, food runs, a clothing stall, a partner, a supplier. This church thinks with you.")}
      <div class="wrap" style="padding:1.5rem 1rem 4rem">
        <div class="tabs">
          <a class="tab ${!intent ? "on" : ""}" href="#/ideas">All</a>
          ${D.intents.map((i) => `<a class="tab ${intent === i.slug ? "on" : ""}" href="#/ideas?intent=${i.slug}">${esc(i.name)}</a>`).join("")}
        </div>
        <form class="form" id="ideaForm" style="background:var(--surface);padding:1.25rem;border-radius:16px;border:1px solid var(--border);margin-bottom:2rem">
          <h2>Post an idea</h2>
          <label><span>Title</span><input name="title" required placeholder="I want to start a poultry business" /></label>
          <label><span>The story</span><textarea name="body" required></textarea></label>
          <label><span>Category</span><select name="cat">${["Agriculture","Technology","Fashion","Food","Construction","Transport","Education","Online Business","Manufacturing","Services","Other"].map((c) => `<option>${c}</option>`).join("")}</select></label>
          <label><span>Looking for</span><select name="intent">${D.intents.map((i) => `<option value="${i.slug}">${esc(i.name)}</option>`).join("")}</select></label>
          <label><span>Your name</span><input name="author" required /></label>
          <button class="btn" type="submit">Share with the walls</button>
        </form>
        <div class="grid-2">${list.map((i) => `<a class="biz" href="#/ideas/${i.id}"><span class="pill" style="position:static">${esc((D.intents.find((x) => x.slug === i.intent) || {}).name || "")}</span><h3 style="margin-top:.75rem">${esc(i.title)}</h3><p class="muted">${esc(i.body)}</p><p class="subtle">${esc(i.author)} · ${i.likes} standing with this</p></a>`).join("")}</div>
      </div>`;
  }

  function ideaPage(id) {
    const i = ideas().find((x) => x.id === id);
    if (!i) return `<p class="wrap empty">That idea is not here.</p>`;
    return `<section class="hero"><div class="wrap">
      <p class="kicker">${esc(i.cat)} · ${esc((D.intents.find((x) => x.slug === i.intent) || {}).name || "")}</p>
      <h1>${esc(i.title)}</h1>
      <p class="lede">${esc(i.body)}</p>
      <p class="subtle">${esc(i.author)} · ${i.likes} standing with this</p>
      <button class="btn" data-like="${i.id}">Stand with this</button>
    </div></section>
    <div class="wrap" style="padding:2rem 1rem 4rem;max-width:40rem">
      <h2>Comments</h2>
      ${(i.comments || []).map((c) => `<p><b>${esc(c.a)}</b><br><span class="muted">${esc(c.b)}</span></p>`).join("") || "<p class='empty'>Be the first word.</p>"}
      <form class="form" id="cmtForm" data-idea="${i.id}">
        <label><span>Your name</span><input name="a" required /></label>
        <label><span>Comment</span><textarea name="b" required></textarea></label>
        <button class="btn" type="submit">Reply</button>
      </form>
    </div>`;
  }

  function connectPage() {
    const r = route();
    const q = (r.params.get("q") || "").toLowerCase();
    let ss = services();
    let people = businesses();
    if (q) {
      ss = ss.filter((s) => (s.name + s.desc + (bizById(s.biz) || {}).owner).toLowerCase().includes(q));
      people = people.filter((b) => (b.name + b.tagline + b.about + catName(b.cat)).toLowerCase().includes(q));
    }
    return `${photoHero("connect", "Connect", "Find people, skills, and businesses", "Need a graphic designer, a baker for Saturday, a welder, a driver? Search the members of this church who already do that work.")}
      <form class="wrap" id="connectForm" style="display:flex;gap:.75rem;flex-wrap:wrap;padding-top:1.5rem">
        <input name="q" value="${esc(r.params.get("q") || "")}" placeholder="Graphic designer, baker, transport…" style="max-width:28rem" />
        <button class="btn" type="submit">Find a member</button>
      </form>
      <div class="wrap section">
        <h2>Skills and services</h2>
        <div class="grid-2">${ss
          .map((s) => {
            const b = bizById(s.biz);
            if (!b) return "";
            return `<a class="who" href="#/b/${b.slug}" style="background:var(--surface);padding:1rem;border-radius:16px;border:1px solid var(--border)">${face(b.photo, b.owner)}<span><b style="font-family:var(--font-display);font-size:1.2rem">${esc(s.name)}</b><span class="muted" style="display:block">${esc(b.owner)} · ${esc(b.city)}</span><span>${esc(s.desc)}</span><span style="color:var(--primary)">${esc(s.price)}</span></span></a>`;
          })
          .join("")}</div>
        <h2 style="margin-top:2.5rem">Members on the walls</h2>
        <div class="grid-2">${people.map(bizCard).join("")}</div>
      </div>`;
  }

  function accountPage() {
    const s = session();
    if (!s) {
      return `${photoHero("login", "Your place", "Sign in to the walls", "This market is for people in the church. Sign in to buy, post what you do, and learn.")}
        <div class="wrap" style="padding:2rem 1rem 4rem"><a class="btn lg" href="#/login">Sign in</a> <a class="btn lg outline" href="#/join">Join a church</a></div>`;
    }
    const ch = churches().find((c) => c.id === s.churchId);
    return `${photoHero("login", s.role === "admin" ? "Administrator" : "Your place", esc(s.name), s.status === "pending" ? "Your request is with the church administrator." : `You belong to ${esc(ch ? ch.name : "a church")} · ${esc(s.ministry || "")}.`)}
      <div class="wrap" style="padding:2rem 1rem 4rem;display:grid;gap:1rem;max-width:40rem">
        <p class="muted">${esc(s.email || "")} · ${esc(s.phone || "")}</p>
        <p><span class="pill" style="position:static">${esc(s.status === "approved" ? "Approved member" : "Waiting for approval")}</span> ${s.role === "admin" ? `<span class="pill" style="position:static">Administrator</span>` : ""}</p>
        ${isAdmin() ? `<a class="btn" href="#/admin">Open the administrator desk</a>` : ""}
        ${canPost() ? `<a class="btn outline" href="#/post">Post what you do</a>` : `<a class="btn outline" href="#/join">Ask to join this church</a>`}
        <a class="btn ghost" href="#/orders">Orders</a>
        <button class="btn ghost" id="signOutBtn" type="button">Sign out</button>
      </div>`;
  }

  function churchCard(c, current) {
    const count = D.businesses.filter((b) => b.church === c.id).length;
    return `<article class="biz">
      <p class="meta">${esc(c.city)} · ${esc(c.area)}</p>
      <h3>${esc(c.name)}</h3>
      <p class="muted">${esc(c.about)}</p>
      <p class="subtle">${esc(c.pastor)} · ${count} stalls</p>
      <div class="row">
        <button class="btn sm ${current === c.id ? "" : "outline"}" data-enter-church="${c.id}">${current === c.id ? "Shopping here" : "Shop this market"}</button>
        <a class="btn sm ghost" href="#/join">Join</a>
      </div>
    </article>`;
  }

  function churchesPage(force) {
    const current = currentChurchId();
    return `${photoHero(
      "churches",
      force ? "Begin here" : "Every church has its own walls",
      "Choose a church Kingdom Market",
      "The site looks the same for every church. You simply see that church’s members, stalls and products. A visitor who has come to buy may choose which church market they wish to shop in.",
    )}
      <div class="wrap" style="padding:2rem 1rem 4rem">
        <div class="grid-2">${churches().map((c) => churchCard(c, current)).join("")}</div>
        <p style="margin-top:2rem"><a class="btn outline" href="#/churches/new">Create a Kingdom Market for your church</a></p>
      </div>`;
  }

  function newChurchPage() {
    return `${photoHero("churches", "For pastors and administrators", "Create a Kingdom Market", "Your church receives the same design and the same tools. Members will choose this ministry when they arrive, and you will approve who may post.")}
      <form class="wrap form" id="churchForm" style="padding:2rem 1rem 4rem">
        <label><span>Church name</span><input name="name" required placeholder="Grace Assembly Wakiso" /></label>
        <label><span>Town</span><select name="city">${D.cities.map((c) => `<option>${c}</option>`).join("")}</select></label>
        <label><span>Area or parish</span><input name="area" placeholder="Gayaza road" /></label>
        <label><span>Pastor’s name</span><input name="pastor" required /></label>
        <label><span>Your name as administrator</span><input name="adminName" required /></label>
        <label><span>Your email</span><input name="email" type="email" required /></label>
        <label><span>Phone</span><input name="phone" required /></label>
        <label><span>About this fellowship</span><textarea name="about" required></textarea></label>
        <button class="btn lg" type="submit">Open our Kingdom Market</button>
      </form>`;
  }

  function loginPage() {
    const ch = church();
    return `${photoHero("login", "Members only", "Sign in to the walls", "Only people of this church may post their work. An administrator must approve each person before they join. You may still look around as a visitor once you have chosen a market.")}
      <form class="wrap form" id="loginForm" style="padding:2rem 1rem 4rem">
        <label><span>Email</span><input name="email" type="email" required placeholder="you@fellowship.ug" /></label>
        <button class="btn lg" type="submit">Sign in</button>
        <p class="muted">Try a member: nakato@kingdom.church · or an administrator: admin@kfk.church</p>
        ${ch ? `<button class="btn outline" type="button" id="demoAdmin">Continue as administrator of ${esc(ch.short)}</button>` : ""}
        <button class="btn ghost" type="button" id="demoMember">Walk in as a visiting buyer</button>
        <p><a href="#/join">New here? Ask to join a church</a></p>
      </form>`;
  }

  function joinPage() {
    const ch = church();
    const ministries = (ch && ch.ministries) || D.ministries || [];
    return `${photoHero("login", "Join the fellowship stall", "Choose your church and ministry", "When members arrive they choose the church and ministry they belong to, then join that church’s kingdom. The administrator gives permission before anyone may post.")}
      <form class="wrap form" id="joinForm" style="padding:2rem 1rem 4rem">
        <label><span>Your name</span><input name="name" required placeholder="Name as the church knows you" /></label>
        <label><span>Email</span><input name="email" type="email" required /></label>
        <label><span>Phone</span><input name="phone" required /></label>
        <label><span>Church</span>
          <select name="churchId">${churches()
            .map((c) => `<option value="${c.id}" ${ch && ch.id === c.id ? "selected" : ""}>${esc(c.name)}</option>`)
            .join("")}</select>
        </label>
        <label><span>Ministry</span>
          <select name="ministry">${ministries.map((m) => `<option>${esc(m)}</option>`).join("")}</select>
        </label>
        <button class="btn lg" type="submit">Ask to join</button>
      </form>`;
  }

  function adminPage() {
    if (!isAdmin()) {
      return `${photoHero("admin", "Administrator desk", "This desk is for the church administrator", "Sign in as the administrator of this Kingdom Market to welcome people who have asked to join.")}
        <div class="wrap" style="padding:2rem 1rem 4rem"><a class="btn lg" href="#/login">Sign in</a></div>`;
    }
    const ch = church();
    const list = members().filter((m) => m.churchId === currentChurchId());
    const pending = list.filter((m) => m.status === "pending");
    const approved = list.filter((m) => m.status === "approved");
    return `${photoHero("admin", esc(ch ? ch.name : "Administrator"), "Welcome people into the walls", "Approve those who belong to this church. Only then may they post what they do.")}
      <div class="wrap" style="padding:2rem 1rem 4rem;display:grid;gap:1rem">
        <h2>Waiting</h2>
        ${
          pending.length
            ? pending
                .map(
                  (m) => `<article class="biz"><h3>${esc(m.name)}</h3><p class="muted">${esc(m.email)} · ${esc(m.ministry)}</p><button class="btn sm" data-approve="${m.id}">Approve and allow posting</button></article>`
                )
                .join("")
            : "<p class='empty'>No one is waiting.</p>"
        }
        <h2 style="margin-top:1rem">Members of this market</h2>
        ${approved
          .map((m) => `<p class="who" style="background:var(--surface);padding:1rem;border-radius:12px;border:1px solid var(--border)"><span><b>${esc(m.name)}</b><span class="subtle" style="display:block">${esc(m.role)} · ${esc(m.ministry)}</span></span></p>`)
          .join("")}
      </div>`;
  }

  function page() {
    const r = route();
    const p = r.parts;
    const open = ["churches", "login", "join"];
    if (!currentChurchId() && !open.includes(p[0] || "churches")) return churchesPage(true);
    if (p[0] === "walls") return walls();
    if (p[0] === "p" && p[1]) return productPage(p[1]);
    if (p[0] === "b" && p[1]) return businessPage(p[1]);
    if (p[0] === "post") return postPage();
    if (p[0] === "cart") return cartPage();
    if (p[0] === "checkout") return checkoutPage();
    if (p[0] === "orders") return ordersPage();
    if (p[0] === "learn" && p[1]) return coursePage(p[1]);
    if (p[0] === "learn") return learnPage();
    if (p[0] === "ideas" && p[1]) return ideaPage(p[1]);
    if (p[0] === "ideas") return ideasPage();
    if (p[0] === "connect") return connectPage();
    if (p[0] === "account") return accountPage();
    if (p[0] === "churches" && p[1] === "new") return newChurchPage();
    if (p[0] === "churches") return churchesPage(false);
    if (p[0] === "login") return loginPage();
    if (p[0] === "join") return joinPage();
    if (p[0] === "admin") return adminPage();
    return home();
  }

  function bind() {
    const deskSearch = document.querySelector("header .search");
    if (deskSearch && matchMedia("(min-width: 768px)").matches) deskSearch.style.display = "block";
    $("#menuBtn")?.addEventListener("click", () => $("#mobileMenu")?.classList.toggle("open"));
    $("#themeBtn")?.addEventListener("click", () => {
      const dark = document.documentElement.dataset.theme === "dark";
      if (dark) delete document.documentElement.dataset.theme;
      else document.documentElement.dataset.theme = "dark";
      localStorage.setItem("kom-theme", dark ? "light" : "dark");
    });
    function onSearch(e) {
      e.preventDefault();
      const q = new FormData(e.target).get("q") || "";
      go("/walls?q=" + encodeURIComponent(String(q)));
    }
    $("#searchForm")?.addEventListener("submit", onSearch);
    $("#searchFormM")?.addEventListener("submit", onSearch);
    $("#wallForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const qs = new URLSearchParams();
      for (const [k, v] of f.entries()) if (String(v)) qs.set(k, String(v));
      go("/walls?" + qs.toString());
    });
    $("#connectForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      go("/connect?q=" + encodeURIComponent(String(new FormData(e.target).get("q") || "")));
    });
    $("#postForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(e.target).entries());
      const extra = extraListings();
      const id = "u" + Date.now().toString(36);
      extra.businesses.unshift({
        id,
        slug: id,
        name: f.name,
        cat: f.cat,
        city: f.city,
        owner: f.owner,
        photo: "members/nakato.jpg",
        cover: "products/produce.jpg",
        phone: f.phone || "",
        hours: "By arrangement",
        delivery: "Sunday church pickup or as agreed",
        tagline: f.tagline || f.product,
        about: f.about || f.desc,
        verified: false,
        rating: 5,
        reviews: 0,
        church: currentChurchId(),
      });
      extra.products.unshift({
        id: id + "p",
        slug: id + "-item",
        biz: id,
        name: f.product,
        cat: f.cat,
        price: Number(f.price) || 0,
        compare: null,
        img: "products/produce.jpg",
        badge: "New",
        ship: "ship",
        mins: null,
        rating: 5,
        reviews: 0,
        stock: 12,
        desc: f.desc || f.tagline,
        church: currentChurchId(),
      });
      store.set("kom-extra", extra);
      toast("Your stall is on the walls");
      go("/b/" + id);
    });
    $("#checkForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(e.target).entries());
      const orders = store.get("kom-orders", []);
      orders.unshift({
        id: "KM-" + Date.now().toString(36).toUpperCase(),
        status: "placed",
        ...f,
        items: cart(),
        total: cartTotal(),
      });
      store.set("kom-orders", orders);
      store.set("kom-cart", []);
      toast("Order placed with the member");
      go("/orders");
    });
    $("#ideaForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(e.target).entries());
      const list = ideas();
      const id = "idea-" + Date.now().toString(36);
      list.unshift({ id, author: f.author, title: f.title, cat: f.cat, intent: f.intent, likes: 1, body: f.body, comments: [], church: currentChurchId() });
      store.set("kom-ideas", list);
      toast("Idea posted");
      go("/ideas/" + id);
    });
    $("#cmtForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const id = e.target.getAttribute("data-idea");
      const f = Object.fromEntries(new FormData(e.target).entries());
      const list = ideas();
      const hit = list.find((x) => x.id === id);
      if (hit) {
        hit.comments = hit.comments || [];
        hit.comments.push(f);
        store.set("kom-ideas", list);
      }
      render();
    });
    $("#profForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      store.set("kom-profile", Object.fromEntries(new FormData(e.target).entries()));
      toast("Profile saved");
    });
    $("#signOutBtn")?.addEventListener("click", () => {
      store.set("kom-session", null);
      toast("Signed out");
      go("/login");
    });
    document.querySelectorAll("[data-enter-church]").forEach((btn) =>
      btn.addEventListener("click", () => {
        store.set("kom-church-id", btn.getAttribute("data-enter-church"));
        toast("You are inside these walls");
        go("/");
      }),
    );
    $("#loginForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = String(new FormData(e.target).get("email") || "")
        .trim()
        .toLowerCase();
      const hit = members().find((m) => m.email.toLowerCase() === email);
      if (!hit) {
        toast("No member with that email on this device. Ask to join.");
        return;
      }
      store.set("kom-session", hit);
      store.set("kom-church-id", hit.churchId);
      toast(hit.status === "pending" ? "Signed in. Waiting for approval." : "Welcome inside the walls");
      go("/");
    });
    $("#demoAdmin")?.addEventListener("click", () => {
      const id = currentChurchId();
      const admin = members().find((m) => m.role === "admin" && m.churchId === id);
      if (admin) {
        store.set("kom-session", admin);
        toast("Signed in as administrator");
        go("/admin");
      }
    });
    $("#demoMember")?.addEventListener("click", () => {
      store.set("kom-session", null);
      toast("You may shop as a visitor. Join to post.");
      go(currentChurchId() ? "/" : "/churches");
    });
    $("#joinForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(e.target).entries());
      const list = members();
      const row = {
        id: "join-" + Date.now().toString(36),
        name: f.name,
        email: f.email,
        phone: f.phone,
        churchId: f.churchId,
        ministry: f.ministry,
        role: "pending",
        status: "pending",
        canPost: false,
      };
      list.unshift(row);
      store.set("kom-members", list);
      store.set("kom-session", row);
      store.set("kom-church-id", f.churchId);
      toast("Asked to join. The administrator will welcome you.");
      go("/account");
    });
    $("#churchForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(e.target).entries());
      const id = "ch" + Date.now().toString(36);
      const extra = extraChurches();
      extra.unshift({
        id,
        slug: id,
        name: f.name,
        short: f.city,
        city: f.city,
        area: f.area || f.city,
        pastor: f.pastor,
        adminName: f.adminName,
        phone: f.phone,
        about: f.about,
        ministries: D.ministries,
      });
      store.set("kom-churches-extra", extra);
      const list = members();
      const admin = {
        id: "admin-" + id,
        name: f.adminName,
        email: f.email,
        phone: f.phone,
        churchId: id,
        ministry: "Sunday congregation",
        role: "admin",
        status: "approved",
        canPost: true,
      };
      list.unshift(admin);
      store.set("kom-members", list);
      store.set("kom-session", admin);
      store.set("kom-church-id", id);
      toast("Your church Kingdom Market is open");
      go("/");
    });
    document.querySelectorAll("[data-approve]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const list = members();
        const hit = list.find((m) => m.id === btn.getAttribute("data-approve"));
        if (hit) {
          hit.status = "approved";
          hit.role = "member";
          hit.canPost = true;
          store.set("kom-members", list);
          const s = session();
          toast("Welcome them. They may now post.");
          render();
        }
      }),
    );
    app.querySelectorAll("[data-add]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const p = products().find((x) => x.id === btn.getAttribute("data-add"));
        if (p) addCart(p);
      })
    );
    app.querySelectorAll("[data-buy]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const p = products().find((x) => x.id === btn.getAttribute("data-buy"));
        if (p) {
          addCart(p);
          go("/checkout");
        }
      })
    );
    app.querySelectorAll("[data-rm]").forEach((btn) =>
      btn.addEventListener("click", () => {
        store.set(
          "kom-cart",
          cart().filter((i) => i.id !== btn.getAttribute("data-rm"))
        );
        render();
      })
    );
    app.querySelectorAll("[data-qty]").forEach((inp) =>
      inp.addEventListener("change", () => {
        const items = cart();
        const hit = items.find((i) => i.id === inp.getAttribute("data-qty"));
        if (hit) hit.qty = Math.max(1, Number(inp.value) || 1);
        store.set("kom-cart", items);
        render();
      })
    );
    app.querySelectorAll("[data-toast]").forEach((btn) => btn.addEventListener("click", () => toast(btn.getAttribute("data-toast"))));
    app.querySelectorAll("[data-like]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const list = ideas();
        const hit = list.find((x) => x.id === btn.getAttribute("data-like"));
        if (hit) {
          hit.likes += 1;
          store.set("kom-ideas", list);
          render();
        }
      })
    );
    app.querySelectorAll("[data-lesson]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const done = store.get("kom-lessons", {});
        done[btn.getAttribute("data-lesson")] = true;
        store.set("kom-lessons", done);
        toast("Lesson marked complete");
        render();
      })
    );
  }

  function render() {
    const part = route().parts[0] || "home";
    const photos = {
      walls: "walls",
      learn: "learn",
      ideas: "ideas",
      connect: "connect",
      post: "post",
      cart: "cart",
      checkout: "cart",
      churches: "churches",
      login: "login",
      join: "login",
      account: "login",
      admin: "admin",
      orders: "cart",
    };
    document.body.style.setProperty("--wash", 'url("img/heroes/' + (photos[part] || "home") + '.jpg")');
    app.innerHTML = shell(page());
    bind();
    window.scrollTo(0, 0);
  }

  window.addEventListener("hashchange", render);
  window.addEventListener("resize", () => {
    const deskSearch = document.querySelector("header .search");
    if (deskSearch) deskSearch.style.display = matchMedia("(min-width: 768px)").matches ? "block" : "none";
  });
  render();
})();
