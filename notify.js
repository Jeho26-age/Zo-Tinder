import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js";
import { getDatabase, ref, onValue, get, update, increment, set, remove } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyAnXMfYSzMs30oJEeRSCEqExx0gsksuutA",
    authDomain: "zo-tinder.firebaseapp.com",
    databaseURL: "https://zo-tinder-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "zo-tinder",
    storageBucket: "zo-tinder.firebasestorage.app",
    messagingSenderId: "866061631708",
    appId: "1:866061631708:web:f2c70a3989032095803419"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

// --- AUTH CHECK ---
auth.onAuthStateChanged((user) => {
    if (user) {
        loadFollowRequests(user.uid);
        loadLikes(user.uid);
    } else {
        window.location.href = "login.html";
    }
});

// --- LOAD FOLLOW REQUESTS (Mini Cards) ---
function loadFollowRequests(myId) {
    const followRef = ref(database, `follow_requests/${myId}`);
    onValue(followRef, (snapshot) => {
        const list = document.getElementById('followList');
        list.innerHTML = "";
        const data = snapshot.val();

        if (!data) {
            list.innerHTML = `<p class="empty-msg">No new followers yet.</p>`;
            return;
        }

        Object.values(data).forEach(req => {
            const card = document.createElement('div');
            card.className = 'follow-card';
            card.innerHTML = `
                <img src="${req.photo || 'https://via.placeholder.com/50'}" class="user-img">
                <div class="user-info">
                    <div class="user-name">${req.username}, ${req.age}</div>
                    <div class="user-loc">📍 ${req.veng || ''}</div>
                </div>
                <div class="action-btns">
                    <button class="btn-small btn-follow-back" onclick="followBack('${req.from}')">Follow</button>
                    <button class="btn-small btn-view" onclick="viewProfile('${req.from}')">View</button>
                </div>
            `;
            list.appendChild(card);
        });
    });
}

// --- LOAD LIKES (Pop-up Hook) ---
function loadLikes(myId) {
    const likesRef = ref(database, `likes/${myId}`);
    onValue(likesRef, (snapshot) => {
        const list = document.getElementById('likeList');
        list.innerHTML = "";
        const data = snapshot.val();

        if (!data) {
            list.innerHTML = `<p class="empty-msg">No recent activity.</p>`;
            return;
        }

        // We need to fetch user names for the likes
        Object.keys(data).forEach(async (likerId) => {
            const userSnap = await get(ref(database, `users/${likerId}`));
            const userData = userSnap.val();
            if (userData) {
                const item = document.createElement('div');
                item.className = 'like-item';
                item.innerHTML = `<span class="heart-icon">❤️</span> <b>${userData.username}</b> liked your profile.`;
                item.onclick = () => showProfileModal(likerId, userData);
                list.appendChild(item);
            }
        });
    });
}

// --- ACTIONS ---

window.followBack = async (targetId) => {
    const myId = auth.currentUser.uid;
    try {
        // 1. Add to my following
        await set(ref(database, `following/${myId}/${targetId}`), { timestamp: Date.now() });
        // 2. Increment their follower count
        await update(ref(database, `users/${targetId}`), { followersCount: increment(1) });
        // 3. Remove the request from the list
        await remove(ref(database, `follow_requests/${myId}/${targetId}`));
        alert("Followed back!");
    } catch (e) { console.error(e); }
};

window.viewProfile = (id) => {
    window.location.href = `user-view.html?id=${id}`;
};

async function showProfileModal(uid, user) {
    const modal = document.getElementById('profileModal');
    const photo = document.getElementById('modalPhoto');
    const name = document.getElementById('modalName');
    const bio = document.getElementById('modalBio');
    const followBtn = document.getElementById('modalFollowBtn');
    const viewBtn = document.getElementById('modalViewBtn');

    photo.src = user.photoURL || "https://via.placeholder.com/300";
    name.innerText = `${user.username}, ${user.age}`;
    bio.innerText = user.bio || "No bio available.";

    // Check if already following to toggle button text
    const followCheck = await get(ref(database, `following/${auth.currentUser.uid}/${uid}`));
    followBtn.innerText = followCheck.exists() ? "Following" : "Follow Back";
    
    followBtn.onclick = () => {
        if (!followCheck.exists()) window.followBack(uid);
        modal.style.display = 'none';
    };

    viewBtn.onclick = () => window.viewProfile(uid);

    modal.style.display = 'flex';
}
