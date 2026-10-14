(() => {
  const root = document.documentElement;

  // Theme toggle — the initial theme is set by an inline script in <head>.
  const toggle = document.getElementById("theme-toggle");
  if (toggle) {
    toggle.addEventListener("click", () => {
      const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try {
        localStorage.setItem("theme", next);
      } catch (e) {}
    });
  }

  // Close the mobile menu after picking a link
  const menuTrigger = document.getElementById("menu-trigger");
  if (menuTrigger) {
    document.querySelectorAll(".menu-link").forEach((link) =>
      link.addEventListener("click", () => (menuTrigger.checked = false))
    );
  }

  // Table of contents for posts: built from h2/h3, highlights the section in view
  const toc = document.querySelector(".toc");
  const headings = toc
    ? [...document.querySelectorAll(".post .prose h2[id], .post .prose h3[id]")]
    : [];
  if (toc && headings.length >= 2) {
    const list = toc.querySelector(".toc-list");
    const links = headings.map((h) => {
      const li = document.createElement("li");
      li.className = `toc-item toc-${h.tagName.toLowerCase()}`;
      const a = document.createElement("a");
      a.className = "toc-link";
      a.href = `#${h.id}`;
      a.textContent = h.textContent.trim();
      li.appendChild(a);
      list.appendChild(li);
      return a;
    });
    toc.hidden = false;

    let pinned = -1; // index chosen by click, kept until the reader scrolls again

    const mark = (current) =>
      links.forEach((a, i) => {
        a.classList.toggle("active", i === current);
        if (i === current) a.setAttribute("aria-current", "location");
        else a.removeAttribute("aria-current");
      });

    const setActive = () => {
      if (pinned >= 0) return mark(pinned);
      const offset = 140;
      let current = 0;
      headings.forEach((h, i) => {
        if (h.getBoundingClientRect().top - offset <= 0) current = i;
      });
      // At the very bottom, the last heading may never reach the top
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
        current = headings.length - 1;
      }
      mark(current);
    };

    links.forEach((a, i) => a.addEventListener("click", () => {
      pinned = i;
      mark(i);
    }));
    const unpin = () => (pinned = -1);
    ["wheel", "touchmove", "keydown"].forEach((type) =>
      window.addEventListener(type, unpin, { passive: true })
    );
    window.addEventListener("scroll", setActive, { passive: true });
    window.addEventListener("resize", setActive);
    setActive();
  }

  // Back to top button
  const backToTop = document.getElementById("back-to-top");
  if (backToTop) {
    const update = () => backToTop.classList.toggle("visible", window.scrollY > 400);
    window.addEventListener("scroll", update, { passive: true });
    update();
    backToTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  }
})();
