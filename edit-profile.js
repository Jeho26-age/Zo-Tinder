import { initializeApp }            from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js";
import { getDatabase, ref, get, update } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";

// ── Firebase config ────────────────────────────────────────────────────────
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

const CLOUDINARY_CLOUD  = 'duj2rx73z';
const CLOUDINARY_PRESET = 'Zo-Tinder';
const CLOUDINARY_URL    = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`;
const CLOUDINARY_VID    = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/video/upload`;

// ── State ──────────────────────────────────────────────────────────────────
let currentUid       = null;
const OWNER_UID      = "MVnZFJvoIGgRYmsWFeUjNHUv0yg1";
let existingData     = {};
let selectedLookFor  = '';
let selectedInterests = new Set();
let photoFile        = null;
let coverImgFile     = null;
let coverVidFile     = null;
let coverType        = 'image'; // 'image' | 'video'
let hasUnsavedChanges = false;

// ── Interests list ─────────────────────────────────────────────────────────
const INTERESTS = [
    '🎵 Music',      '🎬 Movies',      '⚽ Sports',       '🎮 Gaming',
    '🍳 Cooking',    '✈️ Travel',       '📚 Reading',      '🎨 Art',
    '💃 Dancing',    '📸 Photography',  '🏋️ Fitness',      '🌿 Nature',
    '🎤 Singing',    '🖥️ Tech',         '🙏 Kristian',     '🎭 Drama',
    '🍕 Food',       '🎵 K-Pop',        '🐾 Pets',         '💰 Business',
    '💄 Fashion',    '🏔️ Hiking',       '🏀 Basketball',   '🎻 Traditional Music',
    '🙌 Volunteering','🎲 Board Games',  '🌊 Swimming',     '🎯 Archery',
    '🛺 Riding',     '🧘 Meditation',
];

// ── Toast ──────────────────────────────────────────────────────────────────
function showToast(msg, type = 'error') {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.className   = `toast ${type} show`;
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), 2800);
}

// ── Upload overlay ─────────────────────────────────────────────────────────
function showUpload(show) {
    const el = document.getElementById('uploadOverlay');
    if (el) el.classList.toggle('show', show);
}

// ── Bio character counter ──────────────────────────────────────────────────
const bioEl = document.getElementById('bio');
if (bioEl) {
    bioEl.addEventListener('input', () => {
        const count = document.getElementById('bioCount');
        if (count) count.textContent = `${bioEl.value.length} / 200`;
        hasUnsavedChanges = true;
    });
}

// ── Mark changes on any input ─────────────────────────────────────────────
['username','age','gender','khaw','veng'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => { hasUnsavedChanges = true; });
});

// ── Back button — warn if unsaved ─────────────────────────────────────────
const backBtn = document.getElementById('backBtn');
if (backBtn) {
    backBtn.addEventListener('click', (e) => {
        if (hasUnsavedChanges) {
            if (!confirm('Unsaved changes will be lost. Go back?')) {
                e.preventDefault();
            }
        }
    });
}

// ── Build interests grid ───────────────────────────────────────────────────
function buildInterests() {
    const grid = document.getElementById('interestsGrid');
    if (!grid) return;
    grid.innerHTML = '';
    INTERESTS.forEach(tag => {
        const btn = document.createElement('button');
        btn.className   = 'interest-tag';
        btn.textContent = tag;
        btn.dataset.tag = tag;
        if (selectedInterests.has(tag)) btn.classList.add('active');
        btn.addEventListener('click', () => toggleInterest(tag, btn));
        grid.appendChild(btn);
    });
}

function toggleInterest(tag, btn) {
    if (selectedInterests.has(tag)) {
        selectedInterests.delete(tag);
        btn.classList.remove('active');
    } else {
        if (selectedInterests.size >= 5) {
            showToast('Maximum 5 interests only');
            return;
        }
        selectedInterests.add(tag);
        btn.classList.add('active');
    }
    updateInterestCount();
    hasUnsavedChanges = true;
}

function updateInterestCount() {
    const el = document.getElementById('interestCount');
    if (el) el.textContent = `${selectedInterests.size} / 5 selected`;
}

// ── Looking For ────────────────────────────────────────────────────────────
window.setLookFor = function(val) {
    selectedLookFor = val;
    document.querySelectorAll('.lookfor-btn').forEach(b => b.classList.remove('active'));
    const map = {
        'kawp pui tur':    'lf-kawp',
        'Thian tur':       'lf-thian',
        'Join ve mai mai': 'lf-vibing',
    };
    const el = document.getElementById(map[val]);
    if (el) el.classList.add('active');
    hasUnsavedChanges = true;
};

// ── Cover type toggle ──────────────────────────────────────────────────────
window.setCoverType = function(type) {
    coverType = type;
    document.getElementById('btnCoverImg')?.classList.toggle('active', type === 'image');
    document.getElementById('btnCoverVid')?.classList.toggle('active', type === 'video');

    const locked = document.getElementById('coverLocked');

    if (type === 'video') {
        // App staff (owner/admin/mod) always bypass — no lock
        const appRole = existingData?.role || 'member';
        const isAppStaff = currentUid === OWNER_UID || ['owner','admin','mod'].includes(appRole);
        const hasVideoUnlocked = existingData?.storeUnlocks?.coverVideo === true;
        if (!isAppStaff && !hasVideoUnlocked) {
            if (locked) locked.classList.add('show');
            return;
        }
        if (locked) locked.classList.remove('show');
        // Trigger video file picker
        document.getElementById('coverVidInput')?.click();
    } else {
        if (locked) locked.classList.remove('show');
        // Trigger image file picker
        document.getElementById('coverImgInput')?.click();
    }
};

window.handleCoverClick = function() {
    if (coverType === 'image') {
        document.getElementById('coverImgInput')?.click();
    } else {
        setCoverType('video');
    }
};

// ── Avatar photo picker ────────────────────────────────────────────────────
const photoInput = document.getElementById('photoInput');
if (photoInput) {
    photoInput.addEventListener('change', (e) => {
        photoFile = e.target.files[0];
        if (!photoFile) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const img = document.getElementById('avatarPreview');
            const placeholder = document.getElementById('avatarPlaceholder');
            if (img) { img.src = ev.target.result; img.style.display = 'block'; }
            if (placeholder) placeholder.style.display = 'none';
        };
        reader.readAsDataURL(photoFile);
        hasUnsavedChanges = true;
    });
}

// ── Cover image picker ─────────────────────────────────────────────────────
const coverImgInput = document.getElementById('coverImgInput');
if (coverImgInput) {
    coverImgInput.addEventListener('change', (e) => {
        coverImgFile = e.target.files[0];
        if (!coverImgFile) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const img = document.getElementById('coverPreviewImg');
            const vid = document.getElementById('coverPreviewVid');
            if (img) { img.src = ev.target.result; img.style.display = 'block'; }
            if (vid) vid.style.display = 'none';
            const overlay = document.getElementById('coverOverlay');
            if (overlay) overlay.style.background = 'rgba(0,0,0,0.15)';
        };
        reader.readAsDataURL(coverImgFile);
        hasUnsavedChanges = true;
    });
}

// ── Cover video picker ─────────────────────────────────────────────────────
const coverVidInput = document.getElementById('coverVidInput');
if (coverVidInput) {
    coverVidInput.addEventListener('change', (e) => {
        coverVidFile = e.target.files[0];
        if (!coverVidFile) return;
        const url = URL.createObjectURL(coverVidFile);
        const vid = document.getElementById('coverPreviewVid');
        const img = document.getElementById('coverPreviewImg');
        if (vid) { vid.src = url; vid.style.display = 'block'; }
        if (img) img.style.display = 'none';
        const overlay = document.getElementById('coverOverlay');
        if (overlay) overlay.style.background = 'rgba(0,0,0,0.15)';
        hasUnsavedChanges = true;
    });
}

// ── Load existing data from Firebase ──────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
    if (!user) { window.location.href = 'index.html'; return; }
    currentUid = user.uid;

    try {
        const snap = await get(ref(db, `users/${user.uid}`));
        if (!snap.exists()) return;

        existingData = snap.val();
        const d = existingData;

        // Username
        const usernameEl = document.getElementById('username');
        if (usernameEl) usernameEl.value = d.username || '';

        // Age
        const ageEl = document.getElementById('age');
        if (ageEl) ageEl.value = d.age || '';

        // Gender
        const genderEl = document.getElementById('gender');
        if (genderEl && d.gender) genderEl.value = d.gender;

        // Location
        const khawEl = document.getElementById('khaw');
        const vengEl = document.getElementById('veng');
        if (khawEl) khawEl.value = d.khaw || '';
        if (vengEl) vengEl.value = d.veng || '';

        // Looking For
        if (d.lookingFor) setLookFor(d.lookingFor);

        // Bio
        if (bioEl && d.bio) {
            bioEl.value = d.bio;
            const count = document.getElementById('bioCount');
            if (count) count.textContent = `${d.bio.length} / 200`;
        }

        // Avatar
        if (d.photoURL) {
            const img = document.getElementById('avatarPreview');
            const placeholder = document.getElementById('avatarPlaceholder');
            if (img) { img.src = d.photoURL; img.style.display = 'block'; }
            if (placeholder) placeholder.style.display = 'none';
        }

        // Cover
        if (d.coverVideoURL) {
            const vid = document.getElementById('coverPreviewVid');
            if (vid) { vid.src = d.coverVideoURL; vid.style.display = 'block'; }
            coverType = 'video';
            document.getElementById('btnCoverVid')?.classList.add('active');
            document.getElementById('btnCoverImg')?.classList.remove('active');
        } else if (d.coverImageURL) {
            const img = document.getElementById('coverPreviewImg');
            if (img) { img.src = d.coverImageURL; img.style.display = 'block'; }
        }

        // Interests
        const raw = d.interests;
        const interests = Array.isArray(raw)
            ? raw
            : (raw && typeof raw === 'object' ? Object.values(raw) : []);
        interests.forEach(tag => selectedInterests.add(tag));

        // Build UI
        buildInterests();
        updateInterestCount();

        // Reset unsaved flag after load
        hasUnsavedChanges = false;

    } catch(e) {
        console.error('edit-profile load error:', e);
        showToast('Failed to load profile data');
    }
});

// ── Cloudinary upload helper ───────────────────────────────────────────────
async function uploadToCloudinary(file, type = 'image') {
    const url  = type === 'video' ? CLOUDINARY_VID : CLOUDINARY_URL;
    const form = new FormData();
    form.append('file', file);
    form.append('upload_preset', CLOUDINARY_PRESET);
    const res  = await fetch(url, { method: 'POST', body: form });
    const data = await res.json();
    if (!data.secure_url) throw new Error('Upload failed');
    return data.secure_url;
}

// ── Username uniqueness check ─────────────────────────────────────────────
async function isUsernameAvailable(username) {
    // Same username as current — always ok
    if (username === existingData.username) return true;
    const snap = await get(ref(db, 'users'));
    if (!snap.exists()) return true;
    let taken = false;
    snap.forEach(child => {
        if (child.key !== currentUid && child.val()?.username?.toLowerCase() === username.toLowerCase()) {
            taken = true;
        }
    });
    return !taken;
}

// ── SAVE PROFILE ───────────────────────────────────────────────────────────
window.saveProfile = async function() {
    // ── Validate ───────────────────────────────────────────────────────────
    const username = document.getElementById('username')?.value.trim();
    const age      = document.getElementById('age')?.value.trim();
    const gender   = document.getElementById('gender')?.value;
    const khaw     = document.getElementById('khaw')?.value.trim();
    const veng     = document.getElementById('veng')?.value.trim();
    const bio      = document.getElementById('bio')?.value.trim();

    if (!username)      { showToast('Username a ngai a ni'); return; }
    if (username.length < 3) { showToast('Username hi character 3 lam neih tur'); return; }
    if (!age)           { showToast('Age a ngai a ni'); return; }
    if (!gender)        { showToast('Gender select rawh'); return; }
    if (!selectedLookFor) { showToast('Looking for select rawh'); return; }
    if (!bio)           { showToast('Bio ziak rawh'); return; }
    if (selectedInterests.size === 0) { showToast('Interest pakhat lam thlan rawh'); return; }

    showUpload(true);

    try {
        // ── Username check ─────────────────────────────────────────────────
        const available = await isUsernameAvailable(username);
        if (!available) {
            showToast('Username hi la hmang tawh a ni');
            showUpload(false);
            return;
        }

        // ── Upload photo if changed ────────────────────────────────────────
        let photoURL = existingData.photoURL || '';
        if (photoFile) {
            photoURL = await uploadToCloudinary(photoFile, 'image');
        }

        // ── Upload cover image if changed ──────────────────────────────────
        let coverImageURL = existingData.coverImageURL || '';
        if (coverImgFile) {
            coverImageURL = await uploadToCloudinary(coverImgFile, 'image');
        }

        // ── Upload cover video if changed ──────────────────────────────────
        let coverVideoURL = existingData.coverVideoURL || '';
        if (coverVidFile) {
            coverVideoURL = await uploadToCloudinary(coverVidFile, 'video');
        }

        // ── Build update object ────────────────────────────────────────────
        const updates = {
            username,
            age:        parseInt(age),
            gender,
            khaw:       khaw  || '',
            veng:       veng  || '',
            address:    [khaw, veng].filter(Boolean).join(', '),
            lookingFor: selectedLookFor,
            bio,
            interests:  Array.from(selectedInterests),
            photoURL,
            profileComplete: true,
        };

        // Only update cover fields if they changed
        if (coverImgFile)  updates.coverImageURL = coverImageURL;
        if (coverVidFile)  updates.coverVideoURL = coverVideoURL;

        // If switched to image mode — clear video url
        if (coverType === 'image' && !coverVidFile && existingData.coverVideoURL) {
            updates.coverVideoURL = null;
        }

        await update(ref(db, `users/${currentUid}`), updates);

        hasUnsavedChanges = false;
        showToast('✅ Profile updated!', 'success');
        setTimeout(() => { window.location.href = 'profile.html'; }, 1200);

    } catch(e) {
        console.error('saveProfile error:', e);
        showToast('❌ Failed to save — try again');
    } finally {
        showUpload(false);
    }
};
