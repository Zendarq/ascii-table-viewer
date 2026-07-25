(function () {
  "use strict";

  /* ---------- Tabs ---------- */
  const tabButtons = document.querySelectorAll(".tab-button");
  const tabPanels = document.querySelectorAll(".tab-panel");

  function activateTab(name) {
    tabButtons.forEach((btn) => {
      const active = btn.dataset.tab === name;
      btn.setAttribute("aria-selected", active ? "true" : "false");
    });
    tabPanels.forEach((panel) => {
      panel.hidden = panel.dataset.tabPanel !== name;
    });
    localStorage.setItem("activeTab", name);
  }

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => activateTab(btn.dataset.tab));
  });

  activateTab(localStorage.getItem("activeTab") || "table");

  /* ---------- Theme toggle ---------- */
  const themeToggle = document.getElementById("theme-toggle");
  const root = document.documentElement;

  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    themeToggle.textContent = theme === "dark" ? "☀️" : "🌙";
  }

  const savedTheme = localStorage.getItem("theme");
  applyTheme(
    savedTheme || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
  );

  themeToggle.addEventListener("click", () => {
    const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    applyTheme(next);
    localStorage.setItem("theme", next);
  });

  /* ---------- Reference table search ---------- */
  const searchInput = document.getElementById("search-input");
  const tableRows = document.querySelectorAll("#ascii-table tbody tr");
  const noResults = document.getElementById("no-results");

  searchInput.addEventListener("input", () => {
    const query = searchInput.value.trim().toLowerCase();
    let visibleCount = 0;
    tableRows.forEach((row) => {
      const matches = !query || row.textContent.toLowerCase().includes(query);
      row.hidden = !matches;
      if (matches) visibleCount += 1;
    });
    noResults.hidden = visibleCount !== 0;
  });

  /* ---------- Reference table sorting ---------- */
  const asciiTableBody = document.querySelector("#ascii-table tbody");
  const sortableHeaders = document.querySelectorAll("#ascii-table th.sortable");
  const SORT_LABELS = { dec: "Dec", hex: "Hex", char: "Char", oct: "Oct", bin: "Bin", description: "Description" };
  let currentSort = { key: null, direction: 1 };

  function cellValue(row, key, type, base) {
    const cell = row.querySelector(`td[data-label="${SORT_LABELS[key]}"]`);
    const text = cell.textContent.trim();
    return type === "number" ? parseInt(text, base) : text.toLowerCase();
  }

  sortableHeaders.forEach((th) => {
    th.addEventListener("click", () => {
      const key = th.dataset.sortKey;
      const type = th.dataset.sortType;
      const base = Number(th.dataset.sortBase);
      const direction = currentSort.key === key ? -currentSort.direction : 1;
      currentSort = { key, direction };

      const rows = Array.from(asciiTableBody.querySelectorAll("tr"));
      rows.sort((a, b) => {
        const valueA = cellValue(a, key, type, base);
        const valueB = cellValue(b, key, type, base);
        if (type === "number") return direction * (valueA - valueB);
        return direction * valueA.localeCompare(valueB);
      });
      rows.forEach((row) => asciiTableBody.appendChild(row));

      sortableHeaders.forEach((header) => {
        const indicator = header.querySelector(".sort-indicator");
        indicator.textContent = header === th ? (direction === 1 ? "▲" : "▼") : "";
      });
    });
  });

  /* ---------- Text -> Hex converter ---------- */
  const textInput = document.getElementById("text-input");
  const hexOutput = document.getElementById("hex-output");
  const byteCount = document.getElementById("byte-count");
  const copyHexButton = document.getElementById("copy-hex");

  function textToHex(text) {
    const bytes = Array.from(text).map((ch) => ch.codePointAt(0));
    return {
      hex: bytes.map((code) => code.toString(16).padStart(2, "0")).join(" "),
      count: bytes.length,
    };
  }

  textInput.addEventListener("input", () => {
    const { hex, count } = textToHex(textInput.value);
    hexOutput.value = hex;
    byteCount.textContent = `${count} byte${count === 1 ? "" : "s"}`;
  });

  copyHexButton.addEventListener("click", async () => {
    if (!hexOutput.value) return;
    try {
      await navigator.clipboard.writeText(hexOutput.value);
      const original = copyHexButton.textContent;
      copyHexButton.textContent = "Copied!";
      setTimeout(() => {
        copyHexButton.textContent = original;
      }, 1200);
    } catch (err) {
      hexOutput.select();
      document.execCommand("copy");
    }
  });

  /* ---------- Hex Dump Viewer ---------- */
  const hexdumpInput = document.getElementById("hexdump-input");
  const hexdumpHexEl = document.getElementById("hexdump-hex");
  const hexdumpAsciiEl = document.getElementById("hexdump-ascii");
  const hexdumpEmpty = document.getElementById("hexdump-empty");

  const HEX_BYTE_RE = /\b([0-9a-fA-F]{2})\b/g;

  function parseHexDump(text) {
    const bytes = [];
    const lines = text.split(/\r?\n/);

    lines.forEach((line) => {
      let working = line.trim();
      if (!working) return;

      // Strip a trailing |....| ASCII gutter (xxd/hexdump -C style) if present.
      const gutterMatch = working.match(/\|[^|]*\|\s*$/);
      if (gutterMatch) {
        working = working.slice(0, gutterMatch.index);
      }

      // Strip a leading offset field: hex digits followed by ':' or 2+ spaces.
      working = working.replace(/^\s*[0-9a-fA-F]{4,}:?\s+/, "");

      const matches = working.match(HEX_BYTE_RE);
      if (!matches) return;

      matches.forEach((m) => bytes.push(parseInt(m, 16)));
    });

    return bytes;
  }

  function renderHexDump(bytes) {
    hexdumpHexEl.innerHTML = "";
    hexdumpAsciiEl.innerHTML = "";

    bytes.forEach((byte, index) => {
      const hexSpan = document.createElement("span");
      hexSpan.textContent = byte.toString(16).padStart(2, "0");
      hexSpan.dataset.index = String(index);
      hexdumpHexEl.appendChild(hexSpan);

      const asciiSpan = document.createElement("span");
      asciiSpan.textContent = byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : ".";
      asciiSpan.dataset.index = String(index);
      hexdumpAsciiEl.appendChild(asciiSpan);
    });
  }

  function setHighlight(index, on) {
    [hexdumpHexEl, hexdumpAsciiEl].forEach((container) => {
      const span = container.querySelector(`span[data-index="${index}"]`);
      if (span) span.classList.toggle("highlight", on);
    });
  }

  let pinnedIndex = null;

  function wirePaneEvents(container) {
    container.addEventListener("mouseover", (e) => {
      if (e.target.tagName !== "SPAN" || pinnedIndex !== null) return;
      setHighlight(e.target.dataset.index, true);
    });
    container.addEventListener("mouseout", (e) => {
      if (e.target.tagName !== "SPAN" || pinnedIndex !== null) return;
      setHighlight(e.target.dataset.index, false);
    });
    container.addEventListener("click", (e) => {
      if (e.target.tagName !== "SPAN") return;
      const index = e.target.dataset.index;
      if (pinnedIndex === index) {
        setHighlight(index, false);
        pinnedIndex = null;
      } else {
        if (pinnedIndex !== null) setHighlight(pinnedIndex, false);
        setHighlight(index, true);
        pinnedIndex = index;
      }
    });
  }

  wirePaneEvents(hexdumpHexEl);
  wirePaneEvents(hexdumpAsciiEl);

  hexdumpInput.addEventListener("input", () => {
    pinnedIndex = null;
    const bytes = parseHexDump(hexdumpInput.value);
    renderHexDump(bytes);
    hexdumpEmpty.hidden = bytes.length !== 0;
  });
})();
