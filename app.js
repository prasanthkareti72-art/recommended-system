// Recommendation Simulator UI Controller
let activeDomain = "movies";
let activeTab = "dashboard";
let selectedAlgorithm = "content"; // "content" or "collaborative"

// Custom User Ratings cache (saved to localStorage per domain)
let userRatings = {
  movies: {},
  books: {},
  products: {}
};

// Persona rating presets per domain
const PERSONA_PRESETS = {
  movies: {
    custom: { label: "✍️ Custom Rating", ratings: {} },
    scifi: {
      label: "🛸 Sci-Fi Fanatic",
      ratings: { "m-1": 5, "m-4": 5, "m-6": 5, "m-8": 5, "m-3": 1, "m-7": 1, "m-11": 1 }
    },
    romantic: {
      label: "💖 Romantic Dreamer",
      ratings: { "m-3": 5, "m-7": 5, "m-11": 5, "m-1": 2, "m-2": 1, "m-6": 1, "m-8": 2 }
    },
    comedy: {
      label: "🎭 Comedy Lover",
      ratings: { "m-5": 5, "m-1": 3, "m-3": 3 }
    }
  },
  books: {
    custom: { label: "✍️ Custom Rating", ratings: {} },
    tech: {
      label: "💻 Tech & Science Nerd",
      ratings: { "b-1": 5, "b-5": 5, "b-6": 5, "b-10": 5, "b-3": 1, "b-7": 1 }
    },
    classic: {
      label: "📜 Classic Literature Fan",
      ratings: { "b-2": 4, "b-3": 5, "b-7": 5, "b-1": 2, "b-6": 1 }
    },
    mystery: {
      label: "🔍 Mystery & Crime Follower",
      ratings: { "b-2": 5, "b-9": 5, "b-4": 3, "b-8": 3 }
    }
  },
  products: {
    custom: { label: "✍️ Custom Rating", ratings: {} },
    fitness: {
      label: "🏃 Fitness & Athlete",
      ratings: { "p-2": 5, "p-3": 5, "p-7": 5, "p-8": 5, "p-1": 2, "p-5": 1 }
    },
    tech: {
      label: "🔌 Gadget & Tech Geek",
      ratings: { "p-1": 5, "p-3": 5, "p-4": 5, "p-2": 2, "p-6": 3 }
    },
    chef: {
      label: "🍳 Gourmet Home Chef",
      ratings: { "p-5": 5, "p-9": 5, "p-10": 3 }
    }
  }
};

// Load ratings from localStorage
function loadRatings() {
  const domains = ["movies", "books", "products"];
  domains.forEach(d => {
    try {
      const stored = localStorage.getItem(`rec_user_ratings_${d}`);
      if (stored) {
        userRatings[d] = JSON.parse(stored);
      }
    } catch (e) {
      console.warn("Storage reading blocked, utilizing memory object caches", e);
    }
  });
}

// Save ratings to localStorage
function saveRatings() {
  try {
    localStorage.setItem(`rec_user_ratings_${activeDomain}`, JSON.stringify(userRatings[activeDomain]));
  } catch (e) {
    console.warn("Storage writing blocked", e);
  }
}

// Switch Sidebar Tabs
function switchTab(tabId) {
  const tabs = ["dashboard", "simulator", "explorer", "explainer"];
  tabs.forEach(t => {
    const el = document.getElementById(`tab-${t}`);
    const nav = document.getElementById(`nav-${t}`);
    if (t === tabId) {
      el.classList.remove("hidden");
      nav.className = "w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-blue-600 text-white transition-all duration-150 text-left font-medium text-sm";
    } else {
      el.classList.add("hidden");
      nav.className = "w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 hover:text-white transition-all duration-150 text-left text-sm text-slate-400";
    }
  });
  activeTab = tabId;
  renderActiveView();
}

// Swap active data domain category
function changeDomain() {
  activeDomain = document.getElementById("domain-select").value;
  const current = window.REC_DATASETS[activeDomain];

  // Update header text
  document.getElementById("domain-title").innerText = `${current.title} Simulator`;
  document.getElementById("domain-desc").innerText = current.description;

  // Repopulate Preset selector dropdown
  const presetSelect = document.getElementById("persona-select");
  presetSelect.innerHTML = "";
  const presets = PERSONA_PRESETS[activeDomain];
  Object.keys(presets).forEach(key => {
    presetSelect.innerHTML += `<option value="${key}">${presets[key].label}</option>`;
  });
  presetSelect.value = "custom";

  // Re-run explorer lists and dropdown selectors
  populateMathDropdowns();
  renderActiveView();
}

// Populate items dropdown inside Math Formula Explainer
function populateMathDropdowns() {
  const dataset = window.REC_DATASETS[activeDomain];
  
  // Content dropdowns
  const jaccA = document.getElementById("jaccard-item-a");
  const jaccB = document.getElementById("jaccard-item-b");
  jaccA.innerHTML = "";
  jaccB.innerHTML = "";

  dataset.items.forEach((item, idx) => {
    const selectedA = idx === 0 ? "selected" : "";
    const selectedB = idx === 1 ? "selected" : "";
    jaccA.innerHTML += `<option value="${item.id}" ${selectedA}>${item.title}</option>`;
    jaccB.innerHTML += `<option value="${item.id}" ${selectedB}>${item.title}</option>`;
  });

  // Collaborative dropdowns
  const cosA = document.getElementById("cosine-user-a");
  const cosB = document.getElementById("cosine-user-b");
  
  cosA.innerHTML = `<option value="user">You (Active Profile)</option>`;
  cosB.innerHTML = "";
  
  dataset.users.forEach((u, idx) => {
    const selected = idx === 0 ? "selected" : "";
    cosA.innerHTML += `<option value="${u.name}">${u.name}</option>`;
    cosB.innerHTML += `<option value="${u.name}" ${selected}>${u.name}</option>`;
  });
}

// Render active tab panel values
function renderActiveView() {
  updateDashboardMetrics();

  if (activeTab === "simulator") {
    renderSimulatorRatingsList();
    renderRecommendations();
  } else if (activeTab === "explorer") {
    renderExplorer();
  } else if (activeTab === "explainer") {
    calculateJaccardFormula();
    calculateCosineFormula();
  }
}

// Dashboard statistics updates
function updateDashboardMetrics() {
  const current = window.REC_DATASETS[activeDomain];
  const itemsCount = current.items.length;
  const usersCount = current.users.length;

  let ratingsCount = 0;
  current.users.forEach(u => {
    ratingsCount += Object.keys(u.ratings).length;
  });

  const categories = new Set();
  current.items.forEach(i => {
    i.categories.forEach(c => categories.add(c));
  });

  document.getElementById("stat-items").innerText = itemsCount;
  document.getElementById("stat-users").innerText = usersCount;
  document.getElementById("stat-ratings").innerText = ratingsCount;
  document.getElementById("stat-categories").innerText = categories.size;
}

// Renders the rating elements in simulator panel
function renderSimulatorRatingsList() {
  const dataset = window.REC_DATASETS[activeDomain];
  const ratings = userRatings[activeDomain];
  const list = document.getElementById("rating-item-list");
  list.innerHTML = "";

  dataset.items.forEach(item => {
    const currentRating = ratings[item.id] || 0;
    
    // Renders clickable stars
    let starsHTML = "";
    for (let s = 1; s <= 5; s++) {
      const activeColor = s <= currentRating ? "text-amber-500 fill-amber-500" : "text-slate-350";
      starsHTML += `
        <button onclick="rateItem('${item.id}', ${s})" class="rating-star p-0.5 focus:outline-none transition-transform duration-100 ${activeColor}">
          <i data-lucide="star" class="w-4 h-4"></i>
        </button>
      `;
    }

    list.innerHTML += `
      <div class="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-200/50 rounded-2xl transition-all duration-150">
        <div class="flex-1 min-w-0 pr-3">
          <h4 class="font-bold text-slate-800 text-xs truncate">${item.title}</h4>
          <div class="flex gap-1.5 mt-1 overflow-x-auto">
            ${item.categories.map(c => `<span class="text-[9px] bg-slate-200/75 text-slate-600 px-1.5 py-0.5 rounded font-medium">${c}</span>`).join("")}
          </div>
        </div>
        <div class="flex items-center gap-1.5 flex-shrink-0">
          ${starsHTML}
        </div>
      </div>
    `;
  });
  lucide.createIcons();
}

// Clicking stars handler
function rateItem(itemId, value) {
  const ratings = userRatings[activeDomain];
  // Toggle star value if clicked again
  if (ratings[itemId] === value) {
    delete ratings[itemId];
  } else {
    ratings[itemId] = value;
  }
  
  // Set persona dropdown to custom
  document.getElementById("persona-select").value = "custom";
  
  saveRatings();
  renderSimulatorRatingsList();
  renderRecommendations();
}

// Preset personas selection handler
function applyPersona() {
  const key = document.getElementById("persona-select").value;
  const presets = PERSONA_PRESETS[activeDomain];
  
  if (presets[key]) {
    // Clone preset rating mapping to prevent reference changes
    userRatings[activeDomain] = { ...presets[key].ratings };
    saveRatings();
    renderSimulatorRatingsList();
    renderRecommendations();
  }
}

// Clear ratings
function clearRatings() {
  userRatings[activeDomain] = {};
  document.getElementById("persona-select").value = "custom";
  saveRatings();
  renderSimulatorRatingsList();
  renderRecommendations();
}

// Switch Algorithm toggle cards
function selectAlgorithm(algoType) {
  selectedAlgorithm = algoType;
  
  const contentCard = document.getElementById("algo-card-content");
  const collabCard = document.getElementById("algo-card-collaborative");
  
  const contentCheck = contentCard.querySelector("i[data-lucide='check']");
  const collabCheck = document.getElementById("collab-check");

  if (algoType === "content") {
    contentCard.className = "bg-white p-5 rounded-2xl border-2 border-blue-500 shadow-sm cursor-pointer hover-lift flex flex-col justify-between";
    collabCard.className = "bg-white p-5 rounded-2xl border-2 border-slate-100 shadow-sm cursor-pointer hover-lift flex flex-col justify-between";
    contentCheck.classList.remove("hidden");
    collabCheck.classList.add("hidden");
  } else {
    contentCard.className = "bg-white p-5 rounded-2xl border-2 border-slate-100 shadow-sm cursor-pointer hover-lift flex flex-col justify-between";
    collabCard.className = "bg-white p-5 rounded-2xl border-2 border-blue-500 shadow-sm cursor-pointer hover-lift flex flex-col justify-between";
    contentCheck.classList.add("hidden");
    collabCheck.classList.remove("hidden");
  }

  renderRecommendations();
}

// recommendation Generator Render list
function renderRecommendations() {
  const current = window.REC_DATASETS[activeDomain];
  const ratings = userRatings[activeDomain];
  const resultsDiv = document.getElementById("results-list");
  resultsDiv.innerHTML = "";

  let recommendations = [];

  if (selectedAlgorithm === "content") {
    recommendations = window.PM_RECOMMENDER.getContentRecommendations(ratings, current.items);
  } else {
    recommendations = window.PM_RECOMMENDER.getCollaborativeRecommendations(ratings, current.users, current.items);
  }

  document.getElementById("results-count").innerText = `${recommendations.length} recommendations generated`;

  if (recommendations.length === 0) {
    resultsDiv.innerHTML = `
      <div class="flex flex-col items-center justify-center p-12 text-slate-400 text-center">
        <i data-lucide="sparkles" class="w-8 h-8 text-slate-350 mb-2"></i>
        <span class="text-sm font-semibold">No recommendation results</span>
        <span class="text-xs text-slate-400 mt-1">Rate items on the left to personalize recommendations.</span>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  recommendations.forEach(rec => {
    // Determine score colors
    let scoreColor = "bg-emerald-500";
    if (rec.score < 50) scoreColor = "bg-blue-500";
    if (rec.score < 25) scoreColor = "bg-slate-400";

    resultsDiv.innerHTML += `
      <div class="p-5 flex gap-4 hover:bg-slate-50 transition-colors">
        <div class="flex-1 space-y-1.5 min-w-0">
          <div class="flex justify-between items-start gap-4">
            <h4 class="font-extrabold text-slate-800 text-sm truncate">${rec.title} (${rec.year})</h4>
            <div class="flex items-center gap-2 flex-shrink-0">
              <span class="text-[10px] font-bold text-slate-400 uppercase">${rec.score}% Match</span>
              <div class="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div class="h-full ${scoreColor}" style="width: ${rec.score}%"></div>
              </div>
            </div>
          </div>
          <p class="text-xs text-slate-500 leading-normal line-clamp-2">${rec.desc}</p>
          
          <div class="flex flex-wrap items-center justify-between gap-4 pt-1">
            <div class="flex gap-1.5">
              ${rec.categories.map(c => `<span class="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-medium border border-slate-200/50">${c}</span>`).join("")}
            </div>
            <div class="flex items-center gap-1 text-[10px] text-slate-400 font-semibold bg-slate-50 px-2 py-1 rounded border border-slate-200/30">
              <i data-lucide="info" class="w-3.5 h-3.5 text-blue-500"></i>
              <span>${rec.explanation}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  });
  lucide.createIcons();
}

// Explorer Listing
function renderExplorer() {
  const current = window.REC_DATASETS[activeDomain];
  const itemsDiv = document.getElementById("explorer-item-list");
  const ratingsDiv = document.getElementById("explorer-user-ratings");
  
  const search = document.getElementById("explorer-search").value.toLowerCase();
  
  // 1. Render Catalog list
  itemsDiv.innerHTML = "";
  const filteredItems = current.items.filter(i => {
    return i.title.toLowerCase().includes(search) || i.desc.toLowerCase().includes(search);
  });

  if (filteredItems.length === 0) {
    itemsDiv.innerHTML = `<span class="text-xs text-slate-400 italic block py-12 text-center">No matching catalog items.</span>`;
  } else {
    filteredItems.forEach(i => {
      itemsDiv.innerHTML += `
        <div class="p-4 space-y-1.5 hover:bg-slate-50 transition-colors">
          <div class="flex justify-between items-center">
            <h4 class="font-bold text-slate-800 text-xs">${i.title} (${i.year})</h4>
            <div class="flex gap-1">
              ${i.categories.map(c => `<span class="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">${c}</span>`).join("")}
            </div>
          </div>
          <p class="text-xs text-slate-400 leading-normal line-clamp-2">${i.desc}</p>
        </div>
      `;
    });
  }

  // 2. Render Neighbor ratings vectors
  ratingsDiv.innerHTML = "";
  current.users.forEach(u => {
    let rowsHTML = "";
    Object.keys(u.ratings).forEach(itemId => {
      const item = current.items.find(i => i.id === itemId);
      if (item) {
        let starsHTML = "";
        for (let s = 1; s <= 5; s++) {
          starsHTML += `<i data-lucide="star" class="w-3 h-3 ${s <= u.ratings[itemId] ? 'text-amber-500 fill-amber-500' : 'text-slate-200'}"></i>`;
        }
        rowsHTML += `
          <div class="flex justify-between items-center text-xs py-1 border-b border-slate-100/50 last:border-0">
            <span class="text-slate-500 font-medium truncate max-w-[150px]">${item.title}</span>
            <div class="flex items-center gap-0.5">${starsHTML}</div>
          </div>
        `;
      }
    });

    ratingsDiv.innerHTML += `
      <div class="p-4 bg-slate-50/70 border border-slate-200/50 rounded-2xl space-y-3">
        <h4 class="font-bold text-slate-800 text-xs flex items-center gap-1.5 border-b border-slate-200 pb-2">
          <i data-lucide="user" class="w-3.5 h-3.5 text-indigo-500"></i>
          <span>${u.name}</span>
        </h4>
        <div class="space-y-1.5">${rowsHTML}</div>
      </div>
    `;
  });
  lucide.createIcons();
}

// Calculator: live Jaccard Index overlap formula calculator
function calculateJaccardFormula() {
  const dataset = window.REC_DATASETS[activeDomain];
  const idA = document.getElementById("jaccard-item-a").value;
  const idB = document.getElementById("jaccard-item-b").value;

  const itemA = dataset.items.find(i => i.id === idA);
  const itemB = dataset.items.find(i => i.id === idB);

  if (!itemA || !itemB) return;

  const result = window.PM_RECOMMENDER.calculateJaccard(itemA.categories, itemB.categories);

  document.getElementById("jaccard-set-a").innerText = `[${itemA.categories.join(", ")}]`;
  document.getElementById("jaccard-set-b").innerText = `[${itemB.categories.join(", ")}]`;
  document.getElementById("jaccard-intersection").innerText = `[${result.intersection.join(", ")}]`;
  document.getElementById("jaccard-union").innerText = `[${result.union.join(", ")}]`;
  
  document.getElementById("jaccard-fraction").innerText = `${result.intersection.length} / ${result.union.length}`;
  document.getElementById("jaccard-result").innerText = `(${(result.score * 100).toFixed(1)}% overlap similarity)`;
}

// Calculator: live Cosine Similarity calculator
function calculateCosineFormula() {
  const dataset = window.REC_DATASETS[activeDomain];
  const userAVal = document.getElementById("cosine-user-a").value;
  const userBVal = document.getElementById("cosine-user-b").value;

  let vectorA = {};
  let vectorB = {};

  // Extract Vector A (Either active user rating or neighbor profile)
  if (userAVal === "user") {
    vectorA = userRatings[activeDomain];
  } else {
    const match = dataset.users.find(u => u.name === userAVal);
    if (match) vectorA = match.ratings;
  }

  // Extract Vector B
  const matchB = dataset.users.find(u => u.name === userBVal);
  if (matchB) vectorB = matchB.ratings;

  // Perform computations
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  const allKeys = Array.from(new Set([...Object.keys(vectorA), ...Object.keys(vectorB)]));
  
  allKeys.forEach(k => {
    const valA = vectorA[k] || 0;
    const valB = vectorB[k] || 0;
    dotProduct += valA * valB;
    normA += valA * valA;
    normB += valB * valB;
  });

  const magA = Math.sqrt(normA);
  const magB = Math.sqrt(normB);
  const cosScore = (magA === 0 || magB === 0) ? 0 : dotProduct / (magA * magB);

  document.getElementById("cosine-dot").innerText = dotProduct;
  document.getElementById("cosine-mag-a").innerText = magA.toFixed(2);
  document.getElementById("cosine-mag-b").innerText = magB.toFixed(2);
  document.getElementById("cosine-result").innerText = cosScore.toFixed(3);
}

// Initialization code
window.addEventListener("DOMContentLoaded", () => {
  loadRatings();
  changeDomain();
});
