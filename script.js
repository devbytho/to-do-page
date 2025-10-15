import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, updateDoc, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyC_H86pN0GckmlAso1ZI2f79lIMnsfBDus",
  authDomain: "todo-app-a226a.firebaseapp.com",
  projectId: "todo-app-a226a",
  storageBucket: "todo-app-a226a.firebasestorage.app",
  messagingSenderId: "371015422559",
  appId: "1:371015422559:web:ff237a6e47e909154f41ea",
  measurementId: "G-VG7QSLLYLS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let userId = null;
const taskList = document.getElementById("task-list");
const addTaskBtn = document.getElementById("add-task-btn");
const modal = document.getElementById("task-modal");
const taskNameInput = document.getElementById("task-name");
const taskDateInput = document.getElementById("task-date");
const taskTimeInput = document.getElementById("task-time");
const taskNotes = document.getElementById("task-notes");
const saveTaskBtn = document.getElementById("save-task");
const cancelTaskBtn = document.getElementById("cancel-task");
const progressBar = document.getElementById("progress-bar");
const confettiCanvas = document.getElementById("confetti-canvas");
const miniCalendar = document.getElementById("mini-calendar");
const summaryText = document.getElementById("summary-text");

let tasks = [];

// Firebase Auth
signInAnonymously(auth);
onAuthStateChanged(auth,user=>{
  if(user){
    userId = user.uid;
    loadTasks();
  }
});

// Modal Open
addTaskBtn.addEventListener("click",()=>{
  modal.classList.remove("hidden");
  taskNameInput.value="";
  taskDateInput.valueAsDate = new Date();
  taskTimeInput.value="12:00";
  taskNotes.value="";
});

// Modal Cancel
cancelTaskBtn.addEventListener("click",()=> modal.classList.add("hidden"));

saveTaskBtn.addEventListener("click", async () => {
  const text = taskNameInput.value.trim();
  const date = taskDateInput.value;
  const time = taskTimeInput.value;
  const notes = taskNotes.value.trim();
  if(!text || !date || !time) return alert("Please fill all fields");

  const dueTimestamp = new Date(date+"T"+time).getTime();

  try {
    await addDoc(collection(db,"users",userId,"tasks"),{
      text, notes, dueTimestamp, done:false, createdDate:Date.now()
    });
    modal.classList.add("hidden"); // Sluit modal alleen als het opslaan lukt
    loadTasks();
  } catch(err) {
    console.error("Fout bij opslaan:", err);
    alert("Kon taak niet opslaan. Probeer opnieuw.");
  }
});


// Load Tasks
async function loadTasks(){
  taskList.innerHTML="";
  tasks = [];
  let completed =0;

  const snap = await getDocs(collection(db,"users",userId,"tasks"));
  snap.forEach(docSnap=>{
    const data = docSnap.data();
    data.id = docSnap.id;
    tasks.push(data);
    if(data.done) completed++;
  });

  updateDailySummary();

  tasks.forEach(data=>{
    const li = document.createElement("li");
    li.className="task-item";
    li.style.opacity=0; li.style.transform="translateY(-10px)";

    const now = Date.now();
    const msDay = 24*60*60*1000;

    if(!data.done && now > data.dueTimestamp + msDay) li.classList.add("overdue-day");
    else if(!data.done && now > data.dueTimestamp) li.classList.add("overdue-today");

    const content = document.createElement("div");
    content.className="task-content";

    const bar = document.createElement("div");
    bar.className="task-done-bar";
    if(data.done) bar.style.backgroundColor="#28a745";
    content.appendChild(bar);

    const textSpan = document.createElement("div");
    textSpan.textContent=data.text;
    textSpan.className="task-text";
    content.appendChild(textSpan);

    const infoSpan = document.createElement("div");
    infoSpan.className="task-info";
    const dueDate = new Date(data.dueTimestamp);
    const dateStr = dueDate.toLocaleDateString();
    const timeStr = dueDate.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
    infoSpan.textContent=(data.notes?data.notes+" | ":"")+`Due: ${dateStr} ${timeStr}`;
    content.appendChild(infoSpan);

    content.addEventListener("click", async ()=>{
      await updateDoc(doc(db,"users",userId,"tasks",data.id),{done:!data.done});
      loadTasks();
    });

    li.appendChild(content);

    const del = document.createElement("span");
    del.textContent="✖";
    del.className="task-delete";
    del.addEventListener("click",async (e)=>{
      e.stopPropagation();
      await deleteDoc(doc(db,"users",userId,"tasks",data.id));
      loadTasks();
    });

    li.appendChild(del);
    taskList.appendChild(li);

    setTimeout(()=>{
      li.style.opacity=1;
      li.style.transform="translateY(0)";
    },50);
  });

  updateProgress();
}

// Progress Bar
function updateProgress(){
  const total = tasks.length;
  const done = tasks.filter(t=>t.done).length;
  const percent = total? (done/total)*100 :0;
  progressBar.style.width=percent+"%";
  if(percent===100 && total>0) startConfetti();
}

// Daily Summary
function updateDailySummary(){
  const today = new Date();
  const start = new Date(); start.setHours(0,0,0,0);
  const end = new Date(); end.setHours(23,59,59,999);
  const todayTasks = tasks.filter(t => t.dueTimestamp >= start.getTime() && t.dueTimestamp <= end.getTime());
  const done = todayTasks.filter(t=>t.done).length;
  summaryText.textContent=`${done}/${todayTasks.length} tasks completed`;
}



// Confetti
function startConfetti(){
  confettiCanvas.style.display="block";
  const ctx = confettiCanvas.getContext("2d");
  confettiCanvas.width=window.innerWidth;
  confettiCanvas.height=window.innerHeight;
  let confettis=[];
  for(let i=0;i<150;i++){
    confettis.push({x:Math.random()*window.innerWidth, y:Math.random()*window.innerHeight, r:Math.random()*6+4, d:Math.random()*10+2, color:`hsl(${Math.random()*360},100%,50%)`});
  }
  let frame=0;
  const interval = setInterval(()=>{
    ctx.clearRect(0,0,confettiCanvas.width,confettiCanvas.height);
    confettis.forEach(c=>{
      ctx.fillStyle=c.color;
      ctx.beginPath();
      ctx.arc(c.x,c.y, c.r,0,2*Math.PI);
      ctx.fill();
      c.y+=c.d;
      if(c.y>window.innerHeight) c.y=0;
    });
    frame++;
    if(frame>100){ clearInterval(interval); confettiCanvas.style.display="none";}
  },30);
}
