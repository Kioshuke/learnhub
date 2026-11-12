const fs=require('fs');
const p='C:/Users/admin/Documents/LearnHub/pages/teacher/newtest/script.js';
let s=fs.readFileSync(p,'utf8');
const old=`var numEl = headQ.querySelector(".num");
      if (numEl) {
        numEl.addEventListener("click", function (e) {
          e.stopPropagation();
          splitBtn.style.display = (splitBtn.style.display === "none") ? "inline-block" : "none";
        });
      }`;
const nw=`var numEl = headQ.querySelector(".num");
      if (numEl) {
        numEl.style.cursor = "pointer";
        numEl.title = "Bấm để hiện tuỳ chọn";
        numEl.addEventListener("click", function (e) {
          e.stopPropagation();
          // Toggle menu
          var menu = card.querySelector(".q-action-menu");
          if (!menu) {
            menu = document.createElement("div");
            menu.className = "q-action-menu";
            menu.style.cssText = "display:flex;gap:6px;margin:6px 0 0;flex-wrap:wrap;";
            // 1. Tách từ đây
            var b1 = document.createElement("button");
            b1.type = "button"; b1.className = "btn btn-ghost"; b1.style.cssText = "font-size:12px;padding:4px 8px;";
            b1.innerHTML = '<i class="fa-solid fa-scissors"></i> Tách từ đây';
            b1.addEventListener("click", function (e) { e.stopPropagation(); splitSectionFromQuestion(idx); });
            menu.appendChild(b1);
            // 2. Xoá câu
            var b2 = document.createElement("button");
            b2.type = "button"; b2.className = "btn btn-ghost"; b2.style.cssText = "font-size:12px;padding:4px 8px;color:#dc2626;";
            b2.innerHTML = '<i class="fa-solid fa-trash"></i> Xoá câu';
            b2.addEventListener("click", function (e) {
              e.stopPropagation();
              if (!confirm("Xoá câu này?")) return;
              // remove question from its section
              var gi2 = 0, secI = -1, locI = -1;
              for (var s2 = 0; s2 < testData.length; s2++) {
                var qs2 = testData[s2].questions || [];
                if (idx >= gi2 && idx < gi2 + qs2.length) { secI = s2; locI = idx - gi2; break; }
                gi2 += qs2.length;
              }
              if (secI >= 0) {
                testData[secI].questions.splice(locI, 1);
                if (typeof syncJson === "function") syncJson();
                if (typeof render === "function") render();
                if (window.lhToast) lhToast("Đã xoá câu.", "success");
              }
            });
            menu.appendChild(b2);
            // 3. Sửa thứ tự
            var b3 = document.createElement("button");
            b3.type = "button"; b3.className = "btn btn-ghost"; b3.style.cssText = "font-size:12px;padding:4px 8px;";
            b3.innerHTML = '<i class="fa-solid fa-arrow-up-wide-short"></i> Đổi vị trí';
            b3.addEventListener("click", function (e) {
              e.stopPropagation();
              var newPos = prompt("Nhập vị trí mới (1-" + countQ(testData) + "):", idx + 1);
              if (newPos === null) return;
              var n = parseInt(newPos, 10);
              if (!n || n < 1 || n > countQ(testData)) { if (window.lhToast) lhToast("Vị trí không hợp lệ.", "error"); return; }
              // collect all questions flat
              var flat = [];
              testData.forEach(function (sec) { (sec.questions || []).forEach(function (q) { flat.push({ sec: sec, q: q }); }); });
              var item = flat[idx];
              if (!item) return;
              // remove from current
              var gi3 = 0, secI3 = -1, locI3 = -1;
              for (var s3 = 0; s3 < testData.length; s3++) {
                var qs3 = testData[s3].questions || [];
                if (idx >= gi3 && idx < gi3 + qs3.length) { secI3 = s3; locI3 = idx - gi3; break; }
                gi3 += qs3.length;
              }
              if (secI3 >= 0) testData[secI3].questions.splice(locI3, 1);
              // insert into new position (flatten again)
              var flat2 = [];
              testData.forEach(function (sec) { (sec.questions || []).forEach(function (q) { flat2.push(sec); }); });
              // rebuild sections by inserting item into target section? Simpler: append to first section at end? 
              // Instead, insert question into the section that contains position n-1
              var targetPos = n - 1;
              var gi4 = 0, targetSec = -1, targetLoc = 0;
              for (var s4 = 0; s4 < testData.length; s4++) {
                var qs4 = testData[s4].questions || [];
                if (targetPos >= gi4 && targetPos <= gi4 + qs4.length) { targetSec = s4; targetLoc = targetPos - gi4; break; }
                gi4 += qs4.length;
              }
              if (targetSec < 0) targetSec = testData.length - 1;
              testData[targetSec].questions.splice(targetLoc, 0, item.q);
              if (typeof syncJson === "function") syncJson();
              if (typeof render === "function") render();
              if (window.lhToast) lhToast("Đã đổi vị trí câu hỏi.", "success");
            });
            menu.appendChild(b3);
            // hide splitBtn, use menu
            splitBtn.style.display = "none";
            card.appendChild(menu);
          } else {
            menu.style.display = (menu.style.display === "none") ? "flex" : "none";
          }
        });
      }`;
if(!s.includes(old)){console.log('NOT FOUND'); process.exit(1);}
s=s.replace(old,nw);
fs.writeFileSync(p,s,'utf8');
console.log('done');
