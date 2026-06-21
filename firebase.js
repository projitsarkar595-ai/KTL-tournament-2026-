import { initializeApp }
from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";

import {
getDatabase,
ref,
push,
set,
get,
onValue
}
from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";

/* =========================
   FIREBASE CONFIG
========================= */

const firebaseConfig = {
apiKey: "AIzaSyBFvB110A8AR0CGZM7Km75DjwU1iqT7YPE",
authDomain: "ktl---tournament-2026.firebaseapp.com",
databaseURL: "https://ktl---tournament-2026-default-rtdb.asia-southeast1.firebasedatabase.app",
projectId: "ktl---tournament-2026",
storageBucket: "ktl---tournament-2026.firebasestorage.app",
messagingSenderId: "228615359943",
appId: "1:228615359943:web:8db1473681ad0bc6a61de2"
};
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

function isAdmin(){
  return localStorage.getItem("admin") === "yes";
}

let currentRound = "round1";

/* =========================
   ADD PLAYER
========================= */

window.addPlayer = async () => {

const name =
document.getElementById("name")?.value.trim();

const team =
document.getElementById("team")?.value.trim();

if(!name){

alert("Enter Player Name");
return;

}

await push(
ref(db,"players"),
{
name:name,
team:team || "No Team",
time:Date.now()
}
);

document.getElementById("name").value="";
document.getElementById("team").value="";

alert("Player Registered");

};

/* =========================
   LOAD PLAYERS
========================= */

window.loadPlayers = () => {

const list =
document.getElementById("list");

if(!list) return;

onValue(
ref(db,"players"),
(snapshot)=>{

list.innerHTML="";

if(!snapshot.exists()){

list.innerHTML =
"<p>No Players Registered</p>";

return;

}

let i=1;

snapshot.forEach(child=>{

const p = child.val();

list.innerHTML += `
<p>
${i++}. ${p.name} (${p.team})
</p>
`;

});

}
);

};

/* =========================
   SHUFFLE
========================= */

function shuffle(array){

for(
let i=array.length-1;
i>0;
i--
){

const j =
Math.floor(
Math.random()*(i+1)
);

[array[i],array[j]] =
[array[j],array[i]];

}

return array;

}

/* =========================
   CREATE ROUND
========================= */

async function createRound(
players,
roundName
){

players = shuffle(players);

let matches = [];
let bye = [];

for(
let i=0;
i<players.length;
i+=2
){

if(players[i+1]){

matches.push({
a:players[i],
b:players[i+1]
});

}else{

bye.push(players[i]);

}

}

await set(
ref(db,"rounds/"+roundName),
{
matches,
bye
}
);

await set(
ref(db,"currentRound"),
{
round:roundName
}
);

alert(
roundName +
" Created"
);

}
/* =========================
   START DRAW
========================= */

window.startDraw = async () => {

   if(!isAdmin()){
  alert("Admin Only");
  return;
}
const snap =
await get(ref(db,"players"));

if(!snap.exists()){

alert("No Players Found");
return;

}

let players = [];

snap.forEach(child=>{

players.push(
child.val().name
);

});

if(players.length < 2){

alert("Minimum 2 Players Required");
return;

}

await createRound(
players,
"round1"
);

};

/* =========================
   SHOW MATCHES
========================= */

window.showMatches = () => {

const box =
document.getElementById("matches");

if(!box) return;

onValue(
ref(db,"currentRound"),
async(snapshot)=>{

if(!snapshot.exists())
return;

currentRound =
snapshot.val().round;

const roundSnap =
await get(
ref(
db,
"rounds/" + currentRound
)
);

if(!roundSnap.exists())
return;

const data =
roundSnap.val();

box.innerHTML = "";

data.matches.forEach(
(match,index)=>{

box.innerHTML += `

<div class="match">

<h3>
${currentRound.toUpperCase()}
</h3>

<p>
${match.a}
<strong> VS </strong>
${match.b}
</p>

<br>

<button
onclick="winner('${match.a}')">
${match.a} Win
</button>

<button
onclick="winner('${match.b}')">
${match.b} Win
</button>

</div>

`;

});

}
);

};

/* =========================
   WINNER SELECT
========================= */

window.winner =
async(playerName)=>{

   if(!isAdmin()){
  alert("Admin Only");
  return;
}

const winnerRef =
ref(
db,
"qualified/" +
currentRound
);

const snap =
await get(winnerRef);

/* Duplicate Protection */

let exists = false;

if(snap.exists()){

snap.forEach(child=>{

if(
child.val() === playerName
){
exists = true;
}

});

}

if(exists){

alert(
playerName +
" Already Qualified"
);

return;

}

/* Save Winner */

await push(
winnerRef,
playerName
);

alert(
playerName +
" Qualified"
);

};
/* =========================
   LOAD QUALIFIED PLAYERS
========================= */

window.loadRound = async () => {

const box =
document.getElementById("players");

if(!box) return;

const selected =
document.getElementById("roundSelect")?.value;

let roundName = "round1";

if(selected==="round2Qualified"){
roundName="round1";
}
else if(selected==="round3Qualified"){
roundName="round2";
}
else if(selected==="semiFinalQualified"){
roundName="semi";
}
else if(selected==="finalQualified"){
roundName="final";
}

const snap =
await get(
ref(
db,
"qualified/" + roundName
)
);

box.innerHTML = "";

if(!snap.exists()){

box.innerHTML =
"No Qualified Players";

return;

}

let i = 1;

snap.forEach(child=>{

box.innerHTML += `
<div class="player">
${i++}. ${child.val()}
</div>
`;

});

};

/* =========================
   CREATE NEXT ROUND
========================= */

window.createNextRound = async () => {
 if(!isAdmin()){
  alert("Admin Only");
  return;
}
const current =
await get(
ref(db,"currentRound")
);

if(!current.exists()){

alert("No Current Round");
return;

}

const round =
current.val().round;

let players = [];

/* BYE PLAYERS */

const roundData =
await get(
ref(
db,
"rounds/" + round
)
);

if(
roundData.exists() &&
roundData.val().bye
){

roundData
.val()
.bye
.forEach(player=>{

players.push(player);

});

}

/* QUALIFIED PLAYERS */

const qualified =
await get(
ref(
db,
"qualified/" + round
)
);

if(
qualified.exists()
){

qualified.forEach(child=>{

players.push(
child.val()
);

});

}

/* REMOVE DUPLICATE */

players = [...new Set(players)];

/* CHAMPION */

if(players.length === 1){

await set(
ref(db,"champion"),
{
name:players[0]
}
);

alert(
"🏆 Champion: " +
players[0]
);

return;

}

let nextRound;

/* AUTO ROUND FLOW */

if(players.length === 2){

nextRound = "final";

}
else if(players.length <= 4){

nextRound = "semi";

}
else{

if(round==="round1"){

nextRound="round2";

}
else if(round==="round2"){

nextRound="semi";

}
else{

nextRound="final";

}

}


/* CREATE NEXT ROUND */

await createRound(
players,
nextRound
);

alert(
nextRound +
" Started"
);

};

/* =========================
   START NEW ROUND
========================= */

window.generateNextRound =
async()=>{

await createNextRound();

};

/* =========================
   LOAD CHAMPION
========================= */

window.loadChampion = () => {

const box =
document.getElementById(
"championName"
);

if(!box) return;

onValue(
ref(db,"champion"),
(snapshot)=>{

if(snapshot.exists()){

box.innerHTML =
"🏆 " +
snapshot.val().name;

}else{

box.innerHTML =
"No Champion Yet";

}

}
);

};

/* =========================
   CHAMPION BUTTON
========================= */

window.setChampion = () => {

alert(
"Champion will be generated automatically after Final Round."
);

};

/* =========================
   AUTO LOAD
========================= */

window.saveAwards = async()=>{

const bestPlayer =
document.getElementById("bestPlayerInput")?.value || "";

const topScorer =
document.getElementById("topScorerInput")?.value || "";

const mot =
document.getElementById("motInput")?.value || "";
   
await set(
ref(db,"awards"),
{
bestPlayer,
topScorer,
manOfTournament: mot
}
);

alert("Awards Saved");

};
window.loadAwards = () => {

  const bestPlayer = document.getElementById("bestPlayer");
  const topScorer = document.getElementById("topScorer");
  const mot = document.getElementById("manOfTournament");

  if(!bestPlayer || !topScorer || !mot) return;

  onValue(ref(db,"awards"), (snapshot)=>{

    if(!snapshot.exists()) return;

    const data = snapshot.val();

    bestPlayer.innerText = data.bestPlayer || "-";
    topScorer.innerText = data.topScorer || "-";
    mot.innerText = data.manOfTournament || "-";

  });

};
window.loadSemiFinalTeams = () => {

  const box = document.getElementById("semiFinalData");
  if(!box) return;

  onValue(ref(db,"qualified/semi"), (snapshot)=>{

    box.innerHTML = "";

    if(!snapshot.exists()){
      box.innerHTML = "No Semi Final Players";
      return;
    }

    snapshot.forEach(child=>{
      box.innerHTML += `
        <div class="player">${child.val()}</div>
      `;
    });

  });

};
window.loadFinalTeams = () => {

  const box = document.getElementById("finalData");
  if(!box) return;

  onValue(ref(db,"qualified/final"), (snapshot)=>{

    box.innerHTML = "";

    if(!snapshot.exists()){
      box.innerHTML = "No Final Players";
      return;
    }

    snapshot.forEach(child=>{
      box.innerHTML += `
        <div class="player">${child.val()}</div>
      `;
    });

  });

};




window.addEventListener(
"DOMContentLoaded",
()=>{

if(
document.getElementById("list")
){
loadPlayers();
}

if(
document.getElementById("matches")
){
showMatches();
}

if(document.getElementById("bestPlayer")){
loadAwards();
}

if(document.getElementById("semiFinalData")){
loadSemiFinalTeams();
}

if(document.getElementById("finalData")){
loadFinalTeams();
}

if(
document.getElementById("players")
){
loadRound();
}

if(
document.getElementById("championName")
){
loadChampion();
}

}
);