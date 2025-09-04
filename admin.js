// admin.js 전체 코드

import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { initializeApp } from "./firebase.js";

const firebaseConfig = {
  apiKey: "AIzaSyB3jHIYbOwFiIc4nqT8F9M_AdKwMVVNyLk",
  authDomain: "aidtlecture-d1b2b.firebaseapp.com",
  projectId: "aidtlecture-d1b2b",
  storageBucket: "aidtlecture-d1b2b.firebasestorage.app",
  messagingSenderId: "308403253257",
  appId: "1:308403253257:web:738b8941ae22350a6648d8"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "/login.html";
  }
});

// 탭 전환 (메뉴 클릭 시 화면 변경)
document.addEventListener("DOMContentLoaded", () => {
  const navItems = document.querySelectorAll(".nav-item");
  const views = document.querySelectorAll(".view-section");

  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      const viewId = item.dataset.view;

      views.forEach((view) => {
        if (view.id === `view-${viewId}`) {
          view.classList.remove("hidden");
        } else {
          view.classList.add("hidden");
        }
      });

      navItems.forEach((el) => el.classList.remove("bg-indigo-500", "text-white"));
      item.classList.add("bg-indigo-500", "text-white");
    });
  });
});
