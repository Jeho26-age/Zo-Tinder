import { initializeApp }                from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getAuth, onAuthStateChanged }   from "https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js";
import { getDatabase, ref, get, update } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";

const firebaseConfig = {
    apiKey:            "AIzaSyAnXMfYSzMs30oJEeRSCEqExx0gsksuutA",
    authDomain:        "zo-tinder.firebaseapp.com",
    databaseURL:       "https://zo-tinder-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId:         "zo-tinder",
    storageBucket:     "zo-tinder.firebasestorage.app",
    messagingSenderId: "866061631708",
    appId:             "1:866061631708:web:f2c70a3989032095803419"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getDatabase(app);

const OWNER_UID = "MVnZFJvoIGgRYmsWFeUjNHUv0yg1";

// ── State ──────────────────────────────────────────────────────────────────
let currentUid     = null;
let currentData    = {};
let isOwner        = false;
let userRole       = 'member';
let equippedFrame  = null;
let equippedBubble = null;
let selectedFrame  = null;  // currently tapped card
let selectedBubble = null;

let activeFrameCat  = 'all';
let activeBubbleCat = 'all';

// ── Toast ──────────────────────────────────────────────────────────────────
function showToast(msg, type = 'error') {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.className   = `toast ${type} show`;
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), 2600);
}

// ── Auth ───────────────────────────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
    if (!user) { window.location.href = 'index.html'; return; }
    currentUid = user.uid;

    try {
        const snap  = await get(ref(db, `users/${currentUid}`));
        currentData = snap.exists() ? snap.val() : {};

        isOwner    = currentUid === OWNER_UID;
        userRole   = isOwner ? 'owner' : (currentData.role || 'member');

        equippedFrame  = currentData.equippedFrame  || null;
        equippedBubble = currentData.equippedBubble || null;

        renderFramesTab();
        renderBubblesTab();
        updateBottomBar();

        document.getElementById('loadingOverlay').style.display = 'none';

    } catch(e) {
        console.error('inventory error:', e);
        showToast('Failed to load');
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// FRAME DEFINITIONS
// category: 'staff' | 'leaderboard' | 'obtained'
// ═══════════════════════════════════════════════════════════════════════════
const FRAMES = [
    {
        id:       'default',
        name:     'No Frame',
        category: null,       // always visible
        staffOnly: false,
        preview:  buildDefaultFramePreview,
    },
    {
        id:        'frame-owner',
        name:      'Owner Frame',
        category:  'staff',
        staffOnly: true,
        ownerOnly: true,
        exclusive: '👑',
        preview:   buildOwnerFramePreview,
    },
    // ── Add admin, mod frames here later ──
    // ── Add leaderboard frames here later ──
    // ── Add store/obtained frames here later ──
];

// ═══════════════════════════════════════════════════════════════════════════
// BUBBLE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════
const BUBBLES = [
    {
        id:       'default',
        name:     'No Bubble',
        category: null,
        staffOnly: false,
        preview:  buildDefaultBubblePreview,
    },
    {
        id:        'bubble-owner',
        name:      'Owner Bubble',
        category:  'staff',
        staffOnly: true,
        ownerOnly: true,
        exclusive: '👑',
        preview:   buildOwnerBubblePreview,
    },
    // ── Add more bubbles here later ──
];

// ── Category visibility ────────────────────────────────────────────────────
function isStaff() {
    return ['owner','admin','mod'].includes(userRole);
}

function getCats(items) {
    // Which categories actually exist among visible items
    const cats = new Set();
    items.forEach(item => {
        if (item.staffOnly && !isStaff()) return;
        if (item.category) cats.add(item.category);
    });
    return Array.from(cats);
}

function getVisibleItems(items, cat) {
    return items.filter(item => {
        if (item.ownerOnly && !isOwner) return false;
        if (item.staffOnly && !isStaff()) return false;
        if (cat === 'all') return true;
        if (cat === null)  return item.category === null;
        return item.category === cat;
    });
}

// ─────────────────────────────────────────────────────────────────────────
// RENDER FRAMES TAB
// ─────────────────────────────────────────────────────────────────────────
function renderFramesTab() {
    renderCatTabs('frameCatTabs', FRAMES, activeFrameCat, (cat) => {
        activeFrameCat = cat;
        renderFramesGrid();
    });
    renderFramesGrid();
}

function renderFramesGrid() {
    const grid = document.getElementById('framesGrid');
    if (!grid) return;
    const visible = getVisibleItems(FRAMES, activeFrameCat);
    grid.innerHTML = '';
    visible.forEach(f => grid.appendChild(buildItemCard(f, 'frame')));
}

// ─────────────────────────────────────────────────────────────────────────
// RENDER BUBBLES TAB
// ─────────────────────────────────────────────────────────────────────────
function renderBubblesTab() {
    renderCatTabs('bubbleCatTabs', BUBBLES, activeBubbleCat, (cat) => {
        activeBubbleCat = cat;
        renderBubblesGrid();
    });
    renderBubblesGrid();
}

function renderBubblesGrid() {
    const grid = document.getElementById('bubblesGrid');
    if (!grid) return;
    const visible = getVisibleItems(BUBBLES, activeBubbleCat);
    grid.innerHTML = '';
    visible.forEach(b => grid.appendChild(buildItemCard(b, 'bubble')));
}

// ─────────────────────────────────────────────────────────────────────────
// CATEGORY TABS
// ─────────────────────────────────────────────────────────────────────────
const CAT_LABELS = {
    all:         '✦ All',
    staff:       '👑 App Staff',
    leaderboard: '🏆 Leaderboard',
    obtained:    '🛍️ Obtained',
};

function renderCatTabs(containerId, items, activeCat, onSelect) {
    const wrap = document.getElementById(containerId);
    if (!wrap) return;

    const cats     = getCats(items);
    const allCats  = ['all', ...cats];

    wrap.innerHTML = '';
    allCats.forEach(cat => {
        const btn = document.createElement('button');
        btn.className   = `cat-tab ${cat === activeCat ? 'active' : ''}`;
        btn.textContent = CAT_LABELS[cat] || cat;
        btn.onclick     = () => {
            wrap.querySelectorAll('.cat-tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            onSelect(cat);
        };
        wrap.appendChild(btn);
    });
}

// ─────────────────────────────────────────────────────────────────────────
// BUILD ITEM CARD
// ─────────────────────────────────────────────────────────────────────────
function buildItemCard(item, type) {
    const equipped = type === 'frame'
        ? (equippedFrame  === item.id || (item.id === 'default' && !equippedFrame))
        : (equippedBubble === item.id || (item.id === 'default' && !equippedBubble));

    const selected = type === 'frame'
        ? selectedFrame  === item.id
        : selectedBubble === item.id;

    const card = document.createElement('div');
    card.className = `item-card ${equipped ? 'equipped' : ''} ${selected ? 'selected' : ''}`;
    card.id        = `card-${type}-${item.id}`;

    // Preview box
    const previewBox = document.createElement('div');
    previewBox.className = 'preview-box';
    item.preview(previewBox);

    // Badges
    if (equipped) {
        const eb = document.createElement('div');
        eb.className   = 'card-equipped-label';
        eb.textContent = '✓ Equipped';
        card.appendChild(eb);
    }
    if (item.exclusive) {
        const ex = document.createElement('div');
        ex.className   = 'card-exclusive-badge';
        ex.textContent = `${item.exclusive} Exclusive`;
        card.appendChild(ex);
    }

    card.appendChild(previewBox);

    // Footer
    const footer = document.createElement('div');
    footer.className = 'card-footer';
    footer.innerHTML = `
        <div class="card-name">${item.name}</div>
        <button class="card-equip-btn"   onclick="event.stopPropagation(); equipItem('${type}','${item.id}')">✓ Equip</button>
        <button class="card-unequip-btn" onclick="event.stopPropagation(); unequipItem('${type}')">Unequip</button>
    `;
    card.appendChild(footer);

    // Tap to select
    card.addEventListener('click', () => selectCard(type, item.id));

    return card;
}

// ─────────────────────────────────────────────────────────────────────────
// SELECT (tap) — deselects others, selects this one
// ─────────────────────────────────────────────────────────────────────────
function selectCard(type, itemId) {
    const gridId = type === 'frame' ? 'framesGrid' : 'bubblesGrid';
    const grid   = document.getElementById(gridId);
    if (!grid) return;

    // Deselect all
    grid.querySelectorAll('.item-card').forEach(c => c.classList.remove('selected'));

    // Toggle — if already selected, deselect
    const isSame = type === 'frame' ? selectedFrame === itemId : selectedBubble === itemId;
    if (isSame) {
        if (type === 'frame') selectedFrame = null;
        else selectedBubble = null;
        return;
    }

    // Select new
    if (type === 'frame') selectedFrame = itemId;
    else selectedBubble = itemId;

    const card = document.getElementById(`card-${type}-${itemId}`);
    if (card) card.classList.add('selected');
}

// ─────────────────────────────────────────────────────────────────────────
// EQUIP
// ─────────────────────────────────────────────────────────────────────────
window.equipItem = async function(type, itemId) {
    // 'default' means remove frame/bubble
    const value = itemId === 'default' ? null : itemId;
    const field = type === 'frame' ? 'equippedFrame' : 'equippedBubble';

    if (type === 'frame') equippedFrame  = value;
    else                  equippedBubble = value;

    if (type === 'frame') selectedFrame  = null;
    else                  selectedBubble = null;

    // Re-render grid + bottom bar
    if (type === 'frame') renderFramesGrid();
    else                  renderBubblesGrid();
    updateBottomBar();

    showToast(value ? '✓ Equipped!' : '✓ Removed', 'gold');

    try {
        await update(ref(db, `users/${currentUid}`), { [field]: value });
    } catch(e) {
        console.error('equip error:', e);
        showToast('❌ Failed to save');
        // Revert
        if (type === 'frame') equippedFrame  = currentData.equippedFrame  || null;
        else                  equippedBubble = currentData.equippedBubble || null;
        if (type === 'frame') renderFramesGrid();
        else                  renderBubblesGrid();
        updateBottomBar();
    }
};

// ─────────────────────────────────────────────────────────────────────────
// UNEQUIP (removes entirely, goes to default)
// ─────────────────────────────────────────────────────────────────────────
window.unequipItem = async function(type) {
    await window.equipItem(type, 'default');
};

// ─────────────────────────────────────────────────────────────────────────
// BOTTOM BAR UPDATE
// ─────────────────────────────────────────────────────────────────────────
function updateBottomBar() {
    // Frame
    const wrap = document.getElementById('bottomFrameWrap');
    const ring = document.getElementById('bottomDefaultRing');
    if (wrap) {
        // Remove old frame img if any
        wrap.querySelectorAll('.bottom-owner-frame-img').forEach(el => el.remove());

        if (equippedFrame === 'frame-owner') {
            if (ring) ring.style.display = 'none';
            const img = document.createElement('img');
            img.className = 'bottom-owner-frame-img';
            img.src = 'owner-avatar.png';
            img.alt = '';
            wrap.appendChild(img);
        } else {
            if (ring) ring.style.display = 'block';
        }
    }

    // Bubble
    const bb = document.getElementById('bottomBubble');
    if (bb) {
        if (equippedBubble === 'bubble-owner') {
            bb.className   = 'bottom-bubble-mini bottom-bubble-owner';
            bb.textContent = '👑';
        } else {
            bb.className   = 'bottom-bubble-mini bottom-bubble-default';
            bb.textContent = '💬';
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────
// MAIN TAB SWITCH (Frames ↔ Bubbles)
// ─────────────────────────────────────────────────────────────────────────
window.switchMainTab = function(tab) {
    document.getElementById('framesPanel').style.display  = tab === 'frames'  ? 'contents' : 'none';
    document.getElementById('bubblesPanel').style.display = tab === 'bubbles' ? 'contents' : 'none';
    document.getElementById('mainTabFrames').classList.toggle('active',  tab === 'frames');
    document.getElementById('mainTabBubbles').classList.toggle('active', tab === 'bubbles');
};

// ─────────────────────────────────────────────────────────────────────────
// PREVIEW BUILDERS
// ─────────────────────────────────────────────────────────────────────────

// Default frame — plain avatar, no frame
function buildDefaultFramePreview(box) {
    box.innerHTML = `
        <div class="fp-wrap">
            <div class="fp-avatar">👤</div>
            <div class="fp-default-ring"></div>
        </div>`;
}

// Owner PNG frame
function buildOwnerFramePreview(box) {
    box.innerHTML = `
        <div class="fp-wrap">
            <div class="fp-owner-aura"></div>
            <div class="fp-avatar">👤</div>
            <img class="fp-owner-img" src="owner-avatar.png" alt="">
        </div>`;
}

// Default bubble — plain dark bubble
function buildDefaultBubblePreview(box) {
    box.innerHTML = `
        <div class="bp-wrap">
            <div class="bp-default">No bubble 💬</div>
        </div>`;
}

// Owner gold bubble
function buildOwnerBubblePreview(box) {
    box.innerHTML = `
        <div class="bp-wrap">
            <div class="bp-owner">
                <span class="bpo-crown">👑</span>
                <div class="bpo-text">Owner 👑</div>
                <span class="bpo-line"></span>
                <span class="bpo-ts">now ✓✓</span>
            </div>
        </div>`;
}
