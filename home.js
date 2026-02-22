import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js";
import { getDatabase, ref, onValue, get, update, increment, set, onDisconnect } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";

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

let userStack = [];
let currentUserIndex = 0;
let myData = {};
let searchTimeout;

// --- ATTACH ACTIONS TO WINDOW ---
window.updateAge = (val) => {
    document.getElementById('ageVal').innerText = "18 - " + val;
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        currentUserIndex = 0;
        startDiscovery();
    }, 300);
};

window.nope = () => {
    const card = document.getElementById('mainCard');
    if (card) {
        card.classList.add('slide-right');
        setTimeout(() => { currentUserIndex++; renderCard(); }, 400);
    }
};

window.like = async () => {
    const heartBtn = document.getElementById('heartBtn');
    const card = document.getElementById('mainCard');
    const targetUser = userStack[currentUserIndex];
    
    if (!targetUser || !auth.currentUser) return;

    // UI Feedback: Shake and Color Heart
    if (heartBtn) heartBtn.classList.add('liked');
    if (card) card.classList.add('shake-card');

    const myId = auth.currentUser.uid;
    const targetId = targetUser.uid;

    try {
        // Increment profile likes in user data
        await update(ref(database, `users/${targetId}`), { profileLikes: increment(1) });
        // Save the like relationship
        await set(ref(database, `likes/${myId}/${targetId}`), { timestamp: Date.now() });
        
        const check = await get(ref(database, `likes/${targetId}/${myId}`));
        if (check.exists()) {
            showMizoPopup("IN MATCH E!", `${targetUser.username} nen in match e!`, targetUser.photoURL);
        }
    } catch (e) { console.error(e); }

    setTimeout(() => {
        if (card) {
            card.classList.remove('shake-card');
            card.classList.add('slide-left');
        }
        setTimeout(() => { currentUserIndex++; renderCard(); }, 400);
    }, 600);
};

window.accept = () => window.like();

// --- AUTH & DATA ---
auth.onAuthStateChanged((user) => {
    if (user) {
        get(ref(database, 'users/' + user.uid)).then((snapshot) => {
            myData = snapshot.val() || {};
            startDiscovery();
        });
    } else { window.location.href = "login.html"; }
});

function startDiscovery() {
    onValue(ref(database, 'users'), (snapshot) => {
        const allUsers = snapshot.val();
        if (!allUsers) return;

        const tempStack = [];
        const ageLimit = parseInt(document.getElementById('ageSlider').value);
        const myId = auth.currentUser.uid;

        for (let id in allUsers) {
            if (id === myId) continue;
            let user = allUsers[id];

            if (user.age >= 18 && user.age <= ageLimit) {
                const commonInt = user.interests ? user.interests.filter(i => (myData.interests || []).includes(i)) : [];
                let priority = 0;
                if (user.isOnline) priority += 1000;
                if (user.lookingFor === myData.lookingFor) priority += 500;
                priority += (commonInt.length * 100);

                tempStack.push({ uid: id, ...user, priority });
            }
        }
        userStack = tempStack.sort((a, b) => b.priority - a.priority);
        renderCard();
    }, { onlyOnce: true });
}

function renderCard() {
    const card = document.getElementById('mainCard');
    const heartBtn = document.getElementById('heartBtn');
    const interestContainer = document.getElementById('interestTags');
    
    if(!card) return;

    card.classList.remove('slide-left', 'slide-right', 'shake-card');
    if (heartBtn) heartBtn.classList.remove('liked');
    if (interestContainer) interestContainer.innerHTML = "";

    if (userStack.length === 0 || currentUserIndex >= userStack.length) {
        document.getElementById('currentName').innerText = "A zo ta!";
        document.getElementById('currentPhoto').src = "https://via.placeholder.com/400x600?text=No+More+Users";
        return;
    }

    const user = userStack[currentUserIndex];

    document.getElementById('currentName').innerText = `${user.username}, ${user.age}`;
    document.getElementById('currentLooking').innerText = `Looking for: ${user.lookingFor || 'Thian tur'}`;
    document.getElementById('currentBio').innerText = user.bio ? `"${user.bio}"` : "";
    
    // FIXED LOCATION LOGIC: Khaw, Veng
    const khawPart = user.khaw || "Mizoram";
    const vengPart = user.veng || "";
    document.getElementById('currentVeng').innerText = `📍 ${khawPart}${vengPart ? ', ' + vengPart : ''}`;

    document.getElementById('currentPhoto').src = user.photoURL;

    if (user.interests && Array.isArray(user.interests)) {
        user.interests.forEach(interest => {
            const tag = document.createElement('span');
            tag.className = 'interest-tag';
            tag.innerText = interest;
            interestContainer.appendChild(tag);
        });
    }
    
    const statusLabel = document.getElementById('statusLabel');
    statusLabel.innerText = user.isOnline ? "● ONLINE" : "OFFLINE";
    statusLabel.style.color = user.isOnline ? "#00ff00" : "#888";
}

function showMizoPopup(title, message, photo) {
    const modal = document.createElement('div');
    modal.style.cssText = `position:fixed; inset:0; background:rgba(0,0,0,0.95); z-index:2000; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:20px;`;
    modal.innerHTML = `
        <img src="${photo}" style="width:150px; height:150px; border-radius:50%; border:4px solid #ff4b2b; object-fit:cover;">
        <h1 style="color:#ff4b2b; margin-top:20px;">${title}</h1>
        <p style="color:white; margin:10px 0 20px;">${message}</p>
        <button onclick="this.parentElement.remove()" style="padding:12px 30px; background:#ff4b2b; color:white; border:none; border-radius:20px; font-weight:bold; cursor:pointer;">AW LE!</button>
    `;
    document.body.appendChild(modal);
}
