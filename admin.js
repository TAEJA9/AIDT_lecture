// admin.js 전체 코드

import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getFirestore,
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { initializeApp } from "./firebase.js";
import { initCalendar } from "./calendar.js";

const firebaseConfig = {
  apiKey: "AIzaSyB3jHIYbOwFiIc4nqT8F9M_AdKwMVVNyLk",
  authDomain: "aidtlecture-d1b2b.firebaseapp.com",
  projectId: "aidtlecture-d1b2b",
  storageBucket: "aidtlecture-d1b2b.firebasestorage.app",
  messagingSenderId: "308403253257",
  appId: "1:308403253257:web:738b8941ae22350a6648d8"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
  } else {
    document.getElementById("logoutBtn")?.classList.remove("hidden");
    initAdmin();
  }
});

const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await signOut(auth);
      window.location.href = "login.html";
    } catch (e) {
      alert("로그아웃 실패: " + e.message);
    }
  });
}

function initAdmin() {
  initNav();
  initCalendar(db);
  loadApplications();
  loadCourses();
  bindCourseForm();
  setupCalendarConfig();
  bindHamburger();
}

function initNav() {
  const navItems = document.querySelectorAll(".nav-item");
  const views = document.querySelectorAll(".view-section");

  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      const viewId = item.dataset.view;
      views.forEach((v) => v.classList.toggle("hidden", v.id !== `view-${viewId}`));
      navItems.forEach((n) => n.classList.remove("bg-indigo-500", "text-white"));
      item.classList.add("bg-indigo-500", "text-white");
    });
  });
}

function bindHamburger() {
  document.getElementById("asideToggle")?.addEventListener("click", () => {
    document.getElementById("aside")?.classList.toggle("open");
  });

  document.getElementById("asideDesktopToggle")?.addEventListener("click", () => {
    document.getElementById("aside")?.classList.toggle("collapsed");
    document.getElementById("layout")?.classList.toggle("aside-collapsed");
  });
}

function loadApplications() {
  const tbody = document.getElementById("appTbody");
  if (!tbody) return;

  onSnapshot(collection(db, "applications"), (snapshot) => {
    tbody.innerHTML = "";
    snapshot.forEach((docSnap) => {
      const d = docSnap.data();
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="text-center px-4 py-2">${docSnap.id.slice(-5)}</td>
        <td class="px-4 py-2">${d.created_at?.toDate?.().toLocaleDateString?.() || '-'}</td>
        <td class="text-center px-4 py-2">${d.status || '-'}</td>
        <td class="px-4 py-2">${d.school_name || '-'}</td>
        <td class="px-4 py-2">${d.training_type || '-'}</td>
        <td class="px-4 py-2">${d.course_title || '-'}</td>
        <td class="px-4 py-2">${d.wish1Date || '-'} ${d.wish1Time || ''}</td>
        <td class="px-4 py-2">${d.phone || '-'}</td>
        <td class="text-center px-4 py-2"><button class="text-blue-600">관리</button></td>
      `;
      tbody.appendChild(tr);
    });
  });
}

function loadCourses() {
  const tbody = document.getElementById("courseTbody");
  if (!tbody) return;

  onSnapshot(collection(db, "courses"), (snapshot) => {
    tbody.innerHTML = "";
    snapshot.forEach((docSnap) => {
      const c = docSnap.data();
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="px-4 py-2">${c.order || ''}</td>
        <td class="px-4 py-2">${c.title || ''}</td>
        <td class="px-4 py-2">${c.type || ''}</td>
        <td class="px-4 py-2">${c.tools || '-'}</td>
        <td class="px-4 py-2">${c.recommend || '-'}</td>
        <td class="px-4 py-2">${c.effect || '-'}</td>
        <td class="px-4 py-2"><button class="text-red-600" data-id="${docSnap.id}">삭제</button></td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll("button[data-id]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (confirm("정말 삭제하시겠습니까?")) {
          await deleteDoc(doc(db, "courses", btn.dataset.id));
        }
      });
    });
  });
}

function bindCourseForm() {
  const form = document.getElementById("courseForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = document.getElementById("cTitle")?.value;
    const type = document.getElementById("cType")?.value;
    const order = Number(document.getElementById("cOrder")?.value || 0);
    const tools = document.getElementById("cTools")?.value?.split(",").map((s) => s.trim());
    const recommend = document.getElementById("cRecommend")?.value;
    const effect = document.getElementById("cEffect")?.value;

    if (!title || !type) return;

    await addDoc(collection(db, "courses"), {
      title,
      type,
      order,
      tools,
      recommend,
      effect
    });

    form.reset();
  });
}

function setupCalendarConfig() {
  const weekdayWrap = document.getElementById("weekdayWrap");
  const openDatesEl = document.getElementById("openDates");
  const closeDatesEl = document.getElementById("closeDates");
  const saveBtn = document.getElementById("saveCalendarCfg");

  if (!weekdayWrap || !openDatesEl || !closeDatesEl || !saveBtn) return;

  const weekLabels = ["일", "월", "화", "수", "목", "금", "토"];
  const weekdayChecks = [];

  for (let i = 0; i < 7; i++) {
    const label = document.createElement("label");
    label.className = "flex items-center gap-2 text-sm text-gray-700";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = i;
    input.className = "checkbox";
    label.appendChild(input);
    label.appendChild(document.createTextNode(weekLabels[i]));
    weekdayWrap.appendChild(label);
    weekdayChecks.push(input);
  }

  getDoc(doc(db, "config", "calendar")).then((snap) => {
    if (snap.exists()) {
      const data = snap.data();
      (data.openWeekdays || []).forEach((v) => {
        weekdayChecks[v].checked = true;
      });
      openDatesEl.value = (data.extraOpenDates || []).join(", ");
      closeDatesEl.value = (data.extraCloseDates || []).join(", ");
    }
  });

  saveBtn.addEventListener("click", async () => {
    const openWeekdays = weekdayChecks.filter((c) => c.checked).map((c) => Number(c.value));
    const extraOpenDates = openDatesEl.value.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean);
    const extraCloseDates = closeDatesEl.value.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean);

    await setDoc(doc(db, "config", "calendar"), {
      openWeekdays,
      extraOpenDates,
      extraCloseDates
    });

    alert("저장되었습니다.");
  });
}
