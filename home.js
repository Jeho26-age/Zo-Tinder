import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js";
import { getDatabase, ref, onValue, get, update, increment } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";

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
let myInterests = [];

// 1. GET MY OWN DATA FIRST
auth.onAuthStateChanged((user) => {
    if (user) {
        const myRef = ref(database, 'users/' + user.uid);
        get(myRef).then((snapshot) => {
            if (snapshot.exists()) {
                myInterests = snapshot.val().interests || [];
                startDiscovery();
            }
        });
    } else {
        window.location.href = "login.html";
    }
});

// 2. FETCH USERS FROM FIREBASE
function startDiscovery() {
    const usersRef = ref(database, 'users');
    onValue(usersRef, (snapshot) => {
        const data = snapshot.val();
        const tempStack = [];
        const currentAgeLimit = parseInt(document.getElementById('ageSlider').value);

        for (let id in data) {
            if (id === auth.currentUser.uid) continue;

            let user = data[id];
            
            if (user.age >= 18 && user.age <= currentAgeLimit) {
                let matchScore = 0;
                if (user.interests && myInterests.length > 0) {
                    const common = user.interests.filter(i => myInterests.includes(i));
                    matchScore = common.length;
                }

                tempStack.push({
                    uid: id,
                    ...user,
                    score: matchScore,
                    priority: (user.isOnline ? 100 : 0) + (matchScore * 10)
                });
            }
        }

        userStack = tempStack.sort((a, b) => b.priority - a.priority);
        renderCard();
    });
}

// 3. DISPLAY THE CARD
function renderCard() {
    if (currentUserIndex >= userStack.length) {
        document.getElementById('currentName').innerText = "A zo ta!";
        document.getElementById('currentVeng').innerText = "📍 Hnai deuhva awm thar an awm rih lo.";
        document.getElementById('currentPhoto').src = "https://via.placeholder.com/400x600?text=No+More+Users";
        return;
    }

    const user = userStack[currentUserIndex];
    document.getElementById('currentName').innerText = `${user.username}, ${user.age}`;
    document.getElementById('currentVeng').innerText = `📍 ${user.veng}`;
    document.getElementById('currentPhoto').src = user.photoURL || "https://via.placeholder.com/400x600";

    const statusLabel = document.createElement('div');
    statusLabel.id = "statusLabel";
    statusLabel.style.cssText = `
        position: absolute; top: 15px; right: 15px; padding: 5px 12px;
        background: rgba(0,0,0,0.6); border-radius: 20px; font-size: 0.7rem;
        font-weight: bold; color: ${user.isOnline ? '#00ff00' : '#888'};
        border: 1px solid ${user.isOnline ? '#00ff00' : '#444'};
        box-shadow: ${user.isOnline ? '0 0 10px #00ff00' : 'none'};
    `;
    statusLabel.innerText = user.isOnline ? "● ONLINE" : "OFFLINE";
    
    const oldLabel = document.getElementById('statusLabel');
    if (oldLabel) oldLabel.remove();
    document.querySelector('.profile-card').appendChild(statusLabel);

    const infoDiv = document.querySelector('.profile-info');
    const existingTags = document.getElementById('interestTags');
    if (existingTags) existingTags.remove();

    const tagContainer = document.createElement('div');
    tagContainer.id = "interestTags";
    tagContainer.style.cssText = "display: flex; gap: 5px; margin-top: 10px; flex-wrap: wrap;";

    if (user.interests) {
        user.interests.forEach(interest => {
            const isMatch = myInterests.includes(interest);
            const tag = document.createElement('span');
            tag.style.cssText = `
                font-size: 0.65rem; padding: 4px 8px; border-radius: 5px;
                background: ${isMatch ? 'rgba(255, 75, 43, 0.3)' : 'rgba(255,255,255,0.1)'};
                border: 1px solid ${isMatch ? '#ff4b2b' : 'transparent'};
                color: ${isMatch ? '#ff4b2b' : '#ccc'};
            `;
            tag.innerText = interest;
            tagContainer.appendChild(tag);
        });
    }
    infoDiv.appendChild(tagContainer);
}

// 4. UPDATED BUTTON ACTIONS (Saving to Firebase)

window.nope = () => {
    currentUserIndex++;
    renderCard();
};

window.like = () => {
    const targetUser = userStack[currentUserIndex];
    if (!targetUser) return;

    // A. Update the Profile Likes for the Leaderboard
    const userRef = ref(database, 'users/' + targetUser.uid);
    update(userRef, {
        profileLikes: increment(1)
    }).then(() => {
        console.log("Profile Like Added to:", targetUser.username);
    });

    // B. Log the Like in your "likes" folder (for matching logic later)
    const myLikeRef = ref(database, `likes/${auth.currentUser.uid}/${targetUser.uid}`);
    update(myLikeRef, {
        timestamp: Date.now(),
        type: 'profile'
    });

    currentUserIndex++;
    renderCard();
};

window.accept = () => {
    // Standard WhatsApp-style "Direct Message" or "Match" can go here
    currentUserIndex++;
    renderCard();
};

window.updateAge = (val) => {
    document.getElementById('ageVal').innerText = "18 - " + val;
    currentUserIndex = 0; 
    startDiscovery();
};
