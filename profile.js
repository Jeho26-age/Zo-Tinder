import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js";
import { getDatabase, ref, onValue, update } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";
import { getStorage, ref as sRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-storage.js";

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
const db = getDatabase(app);
const auth = getAuth(app);
const storage = getStorage(app);

let currentUser;

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        const userRef = ref(db, 'users/' + user.uid);
        
        onValue(userRef, (snapshot) => {
            const data = snapshot.val();
            if (!data) return;

            // Update UI with explicit labels
            if(document.getElementById('nameText')) 
                document.getElementById('nameText').innerText = data.username || "No Name";
            
            if(document.getElementById('detailsText'))
                document.getElementById('detailsText').innerText = 
                    `Age: ${data.age || '??'} • Gender: ${data.gender || 'N/A'} • Looking for: ${data.lookingFor || 'N/A'}`;
            
            if(document.getElementById('bioText'))
                document.getElementById('bioText').innerText = data.bio || "No bio yet.";

            // Stats Bar mapping
            if(document.getElementById('countFollowers')) 
                document.getElementById('countFollowers').innerText = data.followersCount || "0";
            if(document.getElementById('countLikes')) 
                document.getElementById('countLikes').innerText = data.profileLikes || "0";

            // Interests Tag Cloud (Fixes the innerHTML null error)
            const interestContainer = document.getElementById('interestList');
            if (interestContainer && data.interests && Array.isArray(data.interests)) {
                interestContainer.innerHTML = data.interests
                    .map(item => `<span class="tag">${item}</span>`)
                    .join('');
            }

            // Media Loading
            if (data.photoURL && document.getElementById('userPhoto')) 
                document.getElementById('userPhoto').src = data.photoURL;
            
            if (data.videoURL && document.getElementById('mainBgVideo')) {
                const video = document.getElementById('mainBgVideo');
                const source = document.getElementById('vSource');
                if (source && source.src !== data.videoURL) {
                    source.src = data.videoURL;
                    video.load();
                }
            }

            // Sync Inputs
            if(document.getElementById('nameInp')) document.getElementById('nameInp').value = data.username || "";
            if(document.getElementById('ageInp')) document.getElementById('ageInp').value = data.age || "";
            if(document.getElementById('genderInp')) document.getElementById('genderInp').value = data.gender || "";
            if(document.getElementById('lookingInp')) document.getElementById('lookingInp').value = data.lookingFor || "";
            if(document.getElementById('bioInp')) document.getElementById('bioInp').value = data.bio || "";
        });
    }
});

// SAVE LOGIC
document.getElementById('saveBtn').onclick = async () => {
    const btn = document.getElementById('saveBtn');
    btn.innerText = "Saving Profile...";
    btn.disabled = true;

    const updates = {
        username: document.getElementById('nameInp').value,
        age: parseInt(document.getElementById('ageInp').value) || 0,
        gender: document.getElementById('genderInp').value,
        lookingFor: document.getElementById('lookingInp').value,
        bio: document.getElementById('bioInp').value
    };

    try {
        const photoFile = document.getElementById('photoUp').files[0];
        if (photoFile) {
            const pRef = sRef(storage, `profiles/${currentUser.uid}/photo`);
            await uploadBytes(pRef, photoFile);
            updates.photoURL = await getDownloadURL(pRef);
        }

        const videoFile = document.getElementById('videoUp').files[0];
        if (videoFile) {
            const vRef = sRef(storage, `profiles/${currentUser.uid}/video`);
            await uploadBytes(vRef, videoFile);
            updates.videoURL = await getDownloadURL(vRef);
        }

        await update(ref(db, 'users/' + currentUser.uid), updates);
        document.body.classList.remove('editing');
        alert("Profile Saved!");
    } catch (err) {
        alert("Error: " + err.message);
    } finally {
        btn.innerText = "Save Profile";
        btn.disabled = false;
    }
};
