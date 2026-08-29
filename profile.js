
        import { supabase } from "./supabase-config.js";
        import { onAuthChange, escapeHtml, escapeUrl, beginOnlineSession, finalizeOnlineSession } from "./supabase-helpers.js";
        import { getWeekKey, getWeekStartMs, formatTimer } from "./week-math.js";

        const settingsModal = document.getElementById('settings-modal');
        let settingsEditing = false;
        let currentUserId = null;
        let activeInterval = null;
        let usersChannel = null;
        let viewUserChannel = null; // Channel cho profile người khác
        let ownProfileChannel = null; // Channel cho profile của mình
        let statsChannel = null; // Channel cho stats
        let currentViewUserId = null; // Track user đang xem
        let allUsersData = []; // Toàn bộ users cho modal "Xem thêm"

        // ===== UPDATE ONLINE STATUS =====
        async function updateOnlineStatus(isOnline) {
            if (!currentUserId) return;
            if (isOnline) {
                return beginOnlineSession(currentUserId);
            } else {
                return finalizeOnlineSession(currentUserId);
            }
        }

        // Theo dõi visibility change để cập nhật online status
        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "hidden") {
                if(activeInterval){ clearInterval(activeInterval); activeInterval = null; }
                updateOnlineStatus(false);
            } else {
                updateOnlineStatus(true);
                if(!activeInterval){
                    activeInterval = setInterval(() => {
                        if (currentUserId) {
                            supabase.rpc("users_heartbeat", { p_uid: currentUserId });
                        }
                    }, 5000);
                }
            }
        });

        // pagehide: finalize kể cả khi đóng tab / rời trang (RPC idempotent nên an toàn khi gọi trùng)
        window.addEventListener("pagehide", () => {
            if(activeInterval){ clearInterval(activeInterval); activeInterval = null; }
            updateOnlineStatus(false);
        });

        // beforeunload: dùng sendBeacon + keepalive fetch đảm bảo RPC hoàn thành trước khi trang đóng
        window.addEventListener("beforeunload", () => {
            if (!currentUserId) return;
            try {
                const rpcUrl = "https://hyuzukvxulwouaexatqv.supabase.co/rest/v1/rpc/users_finalize_online";
                const body = JSON.stringify({ p_uid: currentUserId });
                navigator.sendBeacon(rpcUrl, new Blob([body], { type: "application/json" }));
            } catch(e) {}
            try {
                const rpcUrl = "https://hyuzukvxulwouaexatqv.supabase.co/rest/v1/rpc/users_finalize_online";
                fetch(rpcUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "apikey": "sb_publishable_cFWEQ0SQuM8SSrOgbkQ8Kg_tJb3Qw9J",
                        "Authorization": "Bearer sb_publishable_cFWEQ0SQuM8SSrOgbkQ8Kg_tJb3Qw9J"
                    },
                    body: JSON.stringify({ p_uid: currentUserId }),
                    keepalive: true
                }).catch(()=>{});
            } catch(e) {}
            updateOnlineStatus(false);
        });

        // Interval để cập nhật online status mỗi 15 giây (heartbeat qua RPC)
        function startOnlineInterval() {
            if (!activeInterval) {
                activeInterval = setInterval(() => {
                    if (currentUserId) {
                        supabase.rpc("users_heartbeat", { p_uid: currentUserId });
                    }
                }, 5000);
            }
        }

        // Render lưới users: tối đa 17 người + ô "Xem thêm" (18 ô = 3 hàng x 6)
        function renderUserGrid(container, users) {
            const now = Date.now();
            const ACTIVE_THRESHOLD = 10000; // presence theo heartbeat: quá 10s không có tín hiệu = offline

            const displayUsers = users.slice(0, 17);
            const hasMore = users.length > 17;

            let html = '';
            displayUsers.forEach(u => {
                const isOnline = u.online && u.last_active && (now - u.last_active) < ACTIVE_THRESHOLD;
                const statusColor = isOnline ? 'bg-green-500' : 'bg-red-500';
                const statusPulse = isOnline ? 'animate-pulse' : '';

                html += `
                    <div class="flex flex-col items-center text-center p-0.5 rounded-lg hover:bg-white hover:shadow-sm transition-all cursor-pointer group" data-uid="${escapeHtml(u.id)}">
                        <div class="relative">
                            <img src="${escapeUrl(u.photo) || 'https://lh3.googleusercontent.com/a/default-user=s40'}" class="w-10 h-10 rounded-full border border-white shadow-sm group-hover:scale-105 transition-transform">
                            <span class="absolute bottom-0 right-0 w-2 h-2 ${statusColor} border border-white rounded-full ${statusPulse}"></span>
                        </div>
                        <span class="text-xs font-medium mt-1 text-gray-700 truncate w-full px-0.5">${escapeHtml(u.name) || 'User'}</span>
                    </div>
                `;
            });

            // Ô "Xem thêm" chiếm vị trí thứ 18
            if (hasMore) {
                html += `
                    <div class="flex flex-col items-center justify-center p-0.5 rounded-lg hover:bg-white hover:shadow-sm transition-all cursor-pointer border border-dashed border-blue-200 bg-blue-50/30 h-[60px]" onclick="viewAllUsers()">
                        <i class="fas fa-ellipsis-h text-xs text-lh-primary"></i>
                        <span class="text-xs font-bold text-lh-primary mt-1">Xem thêm</span>
                    </div>
                `;
            }

            container.innerHTML = html;
        }

        // ===== LISTEN TO USERS TABLE =====
        async function renderUsers() {
            const usersContainer = document.getElementById('users-grid');
            if (!usersContainer) return;

            const { data } = await supabase.from("users")
                .select("id, name, photo, online, last_active");

            const users = data || [];

            // Sắp xếp: online trước (theo bảng chữ cái), offline sau (theo bảng chữ cái)
            const now = Date.now();
            const ACTIVE_THRESHOLD = 10000; // presence theo heartbeat: quá 30s không có tín hiệu = offline

            users.sort((a, b) => {
                const aOnline = a.online && a.last_active && (now - a.last_active) < ACTIVE_THRESHOLD;
                const bOnline = b.online && b.last_active && (now - b.last_active) < ACTIVE_THRESHOLD;

                // Online trước, offline sau
                if (aOnline && !bOnline) return -1;
                if (!aOnline && bOnline) return 1;

                // Cùng trạng thái, sắp xếp theo bảng chữ cái
                const nameA = (a.name || '').toLowerCase();
                const nameB = (b.name || '').toLowerCase();
                return nameA.localeCompare(nameB, 'vi');
            });

            allUsersData = users;
            renderUserGrid(usersContainer, users);
        }

        // Click 1 lần ủy quyền cho toàn bộ grid (thay onclick inline → chống attribute injection).
        (function () {
            const gridEl = document.getElementById('users-grid');
            if (!gridEl) return;
            gridEl.addEventListener('click', (e) => {
                const item = e.target.closest('[data-uid]');
                if (!item) return;
                if (typeof window.viewUserProfile === 'function') {
                    window.viewUserProfile(item.dataset.uid);
                }
            });
        })();

        function startUsersListener() {
            if (usersChannel) supabase.removeChannel(usersChannel);
            renderUsers();
            usersChannel = supabase.channel("profile-users")
                .on("postgres_changes", { event: "*", schema: "public", table: "users" }, () => renderUsers())
                .subscribe();
        }

        // Xem profile người khác
        window.viewUserProfile = function(userId) {
            const currentUrl = new URL(window.location.href);
            const currentViewUser = currentUrl.searchParams.get('user');

            // Nếu click vào cùng người, không làm gì
            if (currentViewUser === userId) {
                return;
            }

            // Cập nhật URL mà không reload trang
            const newUrl = `profile.html?user=${userId}`;
            window.history.pushState({ userId: userId }, '', newUrl);

            // Load profile người khác
            loadViewUserProfile(userId);
        };

        // Xem tất cả users (mở modal danh sách đầy đủ)
        window.viewAllUsers = function() {
            const modal = document.getElementById('all-users-modal');
            const listEl = document.getElementById('all-users-list');
            if (!modal || !listEl) return;

            const now = Date.now();
            const ACTIVE_THRESHOLD = 10000;

            let html = '';
            allUsersData.forEach(u => {
                const isOnline = u.online && u.last_active && (now - u.last_active) < ACTIVE_THRESHOLD;
                const statusColor = isOnline ? 'bg-green-500' : 'bg-red-500';
                const statusPulse = isOnline ? 'animate-pulse' : '';
                html += `
                    <button type="button" data-uid="${escapeHtml(u.id)}" class="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white hover:shadow-sm transition-all text-left" style="border:none;background:transparent">
                        <div class="relative flex-shrink-0">
                            <img src="${escapeUrl(u.photo) || 'https://lh3.googleusercontent.com/a/default-user=s40'}" class="w-10 h-10 rounded-full border border-white shadow-sm object-cover">
                            <span class="absolute bottom-0 right-0 w-2.5 h-2.5 ${statusColor} border-2 border-white rounded-full ${statusPulse}"></span>
                        </div>
                        <span class="text-sm font-semibold truncate" style="color:var(--text-main)">${escapeHtml(u.name) || 'User'}</span>
                        <span class="ml-auto text-[11px] font-bold flex-shrink-0 ${isOnline ? 'text-emerald-500' : 'text-gray-400'}">${isOnline ? '● Online' : '● Offline'}</span>
                    </button>
                `;
            });

            if (!allUsersData.length) {
                html = '<p class="text-sm font-medium text-center py-8" style="color:var(--text-sub)">Chưa có người dùng nào.</p>';
            }
            listEl.innerHTML = html;

            const countEl = document.getElementById('all-users-count');
            if (countEl) countEl.textContent = allUsersData.length + ' người';

            modal.classList.remove('opacity-0', 'pointer-events-none');
            modal.classList.add('opacity-100');
            modal.querySelector('div').classList.remove('scale-95');
            modal.querySelector('div').classList.add('scale-100');
        };

        window.closeAllUsersModal = function() {
            const modal = document.getElementById('all-users-modal');
            if (!modal) return;
            modal.classList.add('opacity-0', 'pointer-events-none');
            modal.classList.remove('opacity-100');
            modal.querySelector('div').classList.add('scale-95');
            modal.querySelector('div').classList.remove('scale-100');
        };

        (function () {
            const modal = document.getElementById('all-users-modal');
            if (!modal) return;
            modal.addEventListener('click', (e) => {
                if (e.target === e.currentTarget) closeAllUsersModal();
            });
            const listEl = document.getElementById('all-users-list');
            if (listEl) {
                listEl.addEventListener('click', (e) => {
                    const item = e.target.closest('[data-uid]');
                    if (!item) return;
                    closeAllUsersModal();
                    if (typeof window.viewUserProfile === 'function') {
                        window.viewUserProfile(item.dataset.uid);
                    }
                });
            }
        })();

        // Cleanup khi logout
        function cleanup() {
            if (activeInterval) {
                clearInterval(activeInterval);
                activeInterval = null;
            }
            if (usersChannel) {
                supabase.removeChannel(usersChannel);
                usersChannel = null;
            }
            if (viewUserChannel) {
                supabase.removeChannel(viewUserChannel);
                viewUserChannel = null;
            }
            if (ownProfileChannel) {
                supabase.removeChannel(ownProfileChannel);
                ownProfileChannel = null;
            }
            if (statsChannel) {
                supabase.removeChannel(statsChannel);
                statsChannel = null;
            }
        }

        // Đếm số chạy mượt từ 0 lên giá trị đích (count-up), tôn trọng reduced-motion
        function animateCountUp(el, target, opts) {
            if (!el) return;
            opts = opts || {};
            const decimals = opts.decimals || 0;
            const duration = opts.duration || 900;
            const formatter = opts.formatter || function (v) { return v.toFixed(decimals); };
            const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            if (reduceMotion || duration <= 0 || !isFinite(target)) { el.innerText = formatter(target); return; }
            if (el._cuRaf) cancelAnimationFrame(el._cuRaf);
            const start = performance.now();
            function frame(now) {
                const p = Math.min(1, (now - start) / duration);
                const eased = 1 - Math.pow(1 - p, 3);
                el.innerText = formatter(target * eased);
                if (p < 1) {
                    el._cuRaf = requestAnimationFrame(frame);
                } else {
                    el.innerText = formatter(target);
                    el._cuRaf = null;
                }
            }
            el._cuRaf = requestAnimationFrame(frame);
        }

        // Chỉ animate giờ online khi mới mở/đổi profile xem, các lần cập nhật realtime sau đó set thẳng
        let onlineAnimKey = null;
        function setOnlineDisplay(seconds, key) {
            const el = document.getElementById('profile-online-display');
            if (!el) return;
            if (onlineAnimKey !== key) {
                onlineAnimKey = key;
                animateCountUp(el, seconds, { formatter: formatTimer, duration: 1200 });
            } else {
                el.innerText = formatTimer(seconds);
            }
        }

        // Load stats theo UID
        async function fetchStats(uid) {
            const { data } = await supabase.from("test_stats")
                .select("total_tests, total_score, best_score")
                .eq("user_id", uid)
                .maybeSingle();

            if (data) {
                animateCountUp(document.getElementById('stat-total-tests'), data.total_tests || 0);
                animateCountUp(document.getElementById('stat-total-score'), parseFloat(data.total_score || 0), { decimals: 2 });
                animateCountUp(document.getElementById('stat-best-score'), parseFloat(data.best_score || 0), { decimals: 2 });

                const avg = data.total_tests ? (data.total_score / data.total_tests) : 0;
                animateCountUp(document.getElementById('stat-avg-score'), avg, { decimals: 2 });
            } else {
                document.getElementById('stat-total-tests').innerText = 0;
                document.getElementById('stat-total-score').innerText = "0.00";
                document.getElementById('stat-best-score').innerText = "0.00";
                document.getElementById('stat-avg-score').innerText = "0.00";
            }
        }

        function loadStatsForUser(uid) {
            if (statsChannel) {
                supabase.removeChannel(statsChannel);
                statsChannel = null;
            }
            fetchStats(uid);
            statsChannel = supabase.channel("profile-stats-" + uid)
                .on("postgres_changes", { event: "*", schema: "public", table: "test_stats", filter: "user_id=eq." + uid }, () => fetchStats(uid))
                .subscribe();
        }

        // Load profile người khác
        function loadViewUserProfile(userId) {
            // Hủy listener profile của mình trước
            if (ownProfileChannel) {
                supabase.removeChannel(ownProfileChannel);
                ownProfileChannel = null;
            }

            // Hủy listener người khác cũ nếu có
            if (viewUserChannel) {
                supabase.removeChannel(viewUserChannel);
                viewUserChannel = null;
            }

            currentViewUserId = userId;

            // Ẩn phần Hệ Thống Hồ Sơ Người Dùng khi xem profile người khác
            const usersSection = document.getElementById('users-section');
            if (usersSection) usersSection.style.display = 'none';

            const renderViewUser = async () => {
                const { data } = await supabase.from("users")
                    .select("*")
                    .eq("id", userId)
                    .maybeSingle();
                if (data) {
                    document.getElementById('profile-name-display').innerText = data.name || "Người dùng";
                    document.getElementById('profile-email-display').innerText = data.email || "N/A";
                    document.getElementById('profile-avatar-display').src = data.photo || "https://lh3.googleusercontent.com/a/default-user=s120-c";
                    document.getElementById('profile-bio-display').innerText = data.bio ? `"${data.bio}"` : `"Chưa có tiểu sử"`;
                    document.getElementById('profile-phone-display').innerText = data.phone || "Chưa cập nhật";
                    document.getElementById('profile-birth-display').innerText = formatDate(data.birthdate);
                    document.getElementById('profile-gender-display').innerText = data.gender || "Chưa cập nhật";
                    document.getElementById('profile-school-display').innerText = data.school || "Chưa cập nhật";

                    const now = Date.now();
                    const weekKey = getWeekKey();
                    const weekStart = getWeekStartMs();
                    const userWeekKey = data.online_week_key || "";
                    let effectiveTimer = 0;
                    if (userWeekKey === weekKey) {
                        effectiveTimer = Number(data.online_timer || 0);
                        if (data.online && data.last_active && (now - data.last_active) < 10000 && data.online_start_time > 0) {
                            const sessionStart = Math.max(data.online_start_time, weekStart);
                            effectiveTimer += Math.floor((now - sessionStart) / 1000);
                        }
                    } else if (data.online && data.last_active && (now - data.last_active) < 10000 && data.online_start_time > 0) {
                        const sessionStart = Math.max(data.online_start_time, weekStart);
                        effectiveTimer = Math.floor((now - sessionStart) / 1000);
                    }
                    setOnlineDisplay(effectiveTimer, 'view-' + userId);

                    const finalRole = data.role || "Thành viên";
                    document.getElementById('profile-role-display').innerText = finalRole;
                    applyRoleBadgeStyle(finalRole);

                    // Ẩn nút settings khi xem profile người khác
                    const settingsBtn = document.getElementById('settings-btn');
                    if (settingsBtn) settingsBtn.style.display = 'none';

                    // Ẩn nút Xóa tài khoản khi xem profile người khác
                    const deleteQuickBtn = document.getElementById('delete-account-quick-btn');
                    if (deleteQuickBtn) deleteQuickBtn.style.display = 'none';

                    // Load stats của user đang xem
                    loadStatsForUser(userId);
                }
            };

            renderViewUser();
            viewUserChannel = supabase.channel("profile-view-" + userId)
                .on("postgres_changes", { event: "*", schema: "public", table: "users", filter: "id=eq." + userId }, () => renderViewUser())
                .subscribe();
        }

        // Load profile của chính mình
        function loadOwnProfile() {
            // Hủy listener người khác trước
            if (viewUserChannel) {
                supabase.removeChannel(viewUserChannel);
                viewUserChannel = null;
            }

            // Hủy listener profile mình cũ nếu có
            if (ownProfileChannel) {
                supabase.removeChannel(ownProfileChannel);
                ownProfileChannel = null;
            }

            currentViewUserId = null;

            // Hiển thị lại phần Hệ Thống Hồ Sơ Người Dùng khi xem profile của mình
            const usersSection = document.getElementById('users-section');
            if (usersSection) usersSection.style.display = 'block';

            const renderOwnProfile = async () => {
                const { data } = await supabase.from("users")
                    .select("*")
                    .eq("id", currentUserId)
                    .maybeSingle();
                if (data) {
                    document.getElementById('profile-name-display').innerText = data.name || "Chưa cập nhật";
                    document.getElementById('profile-email-display').innerText = data.email || "";
                    document.getElementById('profile-avatar-display').src = data.photo || "https://lh3.googleusercontent.com/a/default-user=s120-c";

                    document.getElementById('profile-bio-display').innerText = data.bio ? `"${data.bio}"` : `"Chưa có tiểu sử"`;
                    document.getElementById('profile-phone-display').innerText = data.phone || "Chưa cập nhật";

                    document.getElementById('profile-birth-display').innerText = formatDate(data.birthdate);
                    document.getElementById('profile-gender-display').innerText = data.gender || "Chưa cập nhật";
                    document.getElementById('profile-school-display').innerText = data.school || "Chưa cập nhật";

                    const now = Date.now();
                    const weekKey = getWeekKey();
                    const weekStart = getWeekStartMs();
                    const userWeekKey = data.online_week_key || "";
                    let effectiveTimer = 0;
                    if (userWeekKey === weekKey) {
                        effectiveTimer = Number(data.online_timer || 0);
                        if (data.online && data.last_active && (now - data.last_active) < 10000 && data.online_start_time > 0) {
                            const sessionStart = Math.max(data.online_start_time, weekStart);
                            effectiveTimer += Math.floor((now - sessionStart) / 1000);
                        }
                    } else if (data.online && data.last_active && (now - data.last_active) < 10000 && data.online_start_time > 0) {
                        const sessionStart = Math.max(data.online_start_time, weekStart);
                        effectiveTimer = Math.floor((now - sessionStart) / 1000);
                    }
                    setOnlineDisplay(effectiveTimer, 'own');

                    const finalRole = data.role || "Thành viên";
                    document.getElementById('profile-role-display').innerText = finalRole;

                    applyRoleBadgeStyle(finalRole);

                    if (!settingsEditing) {
                        document.getElementById('input-name').value = data.name || "";
                        document.getElementById('input-avatar').value = data.photo || "";
                        document.getElementById('input-bio').value = data.bio || "";
                        document.getElementById('input-phone').value = data.phone || "";
                        document.getElementById('input-birth').value = data.birthdate || "";
                        document.getElementById('input-gender').value = data.gender || "";
                        document.getElementById('school-name-display').value = data.school || "";
                    }

                    // Hiển thị nút settings khi xem profile của mình
                    const settingsBtn = document.getElementById('settings-btn');
                    if (settingsBtn) settingsBtn.style.display = 'flex';

                    // Hiển thị lại nút Xóa tài khoản khi xem profile của mình
                    const deleteQuickBtn = document.getElementById('delete-account-quick-btn');
                    if (deleteQuickBtn) deleteQuickBtn.style.display = 'inline-flex';

                    // Load stats của chính mình
                    loadStatsForUser(currentUserId);
                } else {
                    // Tạo profile mặc định nếu chưa có
                    const defaultData = {
                        id: currentUserId,
                        name: "",
                        photo: "",
                        bio: "",
                        phone: "",
                        birthdate: "",
                        gender: "",
                        school: "",
                        role: "Thành viên",
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    };
                    supabase.from("users").upsert(defaultData, { onConflict: "id" }).then(() => renderOwnProfile());
                }
            };

            renderOwnProfile();
            ownProfileChannel = supabase.channel("profile-own")
                .on("postgres_changes", { event: "*", schema: "public", table: "users", filter: "id=eq." + currentUserId }, () => renderOwnProfile())
                .subscribe();
        }

        // Theo dõi thay đổi URL để load profile tương ứng
        window.addEventListener('popstate', () => {
            const urlParams = new URLSearchParams(window.location.search);
            const viewUserId = urlParams.get('user');

            if (viewUserId && viewUserId !== currentUserId) {
                loadViewUserProfile(viewUserId);
            } else {
                loadOwnProfile();
            }
        });

        window.openSettingsModal = function() {
            settingsEditing = true;
            settingsModal.classList.remove('opacity-0', 'pointer-events-none');
            settingsModal.firstElementChild.classList.remove('scale-95');
            settingsModal.firstElementChild.classList.add('scale-100');
            switchSettingsTab('info');
        }

        settingsModal.addEventListener('click', function(e) {
            if (e.target === settingsModal) closeSettingsModal();
        });

        window.switchSettingsTab = function(tab) {
            const infoForm = document.getElementById('settings-form');
            const passwordForm = document.getElementById('password-form');
            const dangerForm = document.getElementById('danger-form');
            const btnInfo = document.getElementById('tab-btn-info');
            const btnPassword = document.getElementById('tab-btn-password');
            const btnDanger = document.getElementById('tab-btn-danger');
            const activeClasses = ['lh-tab-active', 'text-lh-primary', 'shadow-sm'];
            const inactiveClasses = ['text-gray-500'];

            [btnInfo, btnPassword, btnDanger].forEach(b => {
                if (b) { b.classList.remove(...activeClasses); b.classList.add(...inactiveClasses); }
            });
            [infoForm, passwordForm, dangerForm].forEach(f => { if (f) f.classList.add('hidden'); });

            if (tab === 'password') {
                passwordForm.classList.remove('hidden');
                btnPassword.classList.add(...activeClasses);
                btnPassword.classList.remove(...inactiveClasses);
            } else if (tab === 'danger') {
                dangerForm.classList.remove('hidden');
                btnDanger.classList.add(...activeClasses);
                btnDanger.classList.remove(...inactiveClasses);
            } else {
                infoForm.classList.remove('hidden');
                btnInfo.classList.add(...activeClasses);
                btnInfo.classList.remove(...inactiveClasses);
            }
        }

        window.closeSettingsModal = function() {
            settingsEditing = false;
            settingsModal.classList.add('opacity-0', 'pointer-events-none');
            settingsModal.firstElementChild.classList.remove('scale-100');
            settingsModal.firstElementChild.classList.add('scale-95');
            document.getElementById('input-old-password').value = "";
            document.getElementById('input-new-password').value = "";
            document.getElementById('input-confirm-password').value = "";
            document.getElementById('input-delete-password').value = "";
            document.getElementById('input-delete-confirm').value = "";
            const delBtn = document.getElementById('btn-delete-account');
            if (delBtn) { delBtn.disabled = false; delBtn.style.opacity = '0.5'; delBtn.style.pointerEvents = 'none'; delBtn.innerHTML = '<i class="fas fa-trash-can mr-1"></i> Xóa tài khoản'; }
        }

        // SỬA LẠI: Hàm format đảm bảo hiển thị đúng cấu trúc DD/MM/YYYY chuẩn chỉnh lên giao diện
        function formatDate(dateString) {
            if (!dateString) return "Chưa cập nhật";
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return dateString;
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
        }

        // SỬA LẠI: Logic phân phối màu chuẩn: Admin -> Đỏ, Giáo viên -> Vàng, Thành viên -> Xanh lá
        function applyRoleBadgeStyle(roleName) {
            const badge = document.getElementById('profile-role-badge');
            const dot = document.getElementById('profile-role-dot');
            if (!badge || !dot) return;

            badge.className = "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold border transition-all duration-300";
            dot.className = "w-2 h-2 rounded-full animate-pulse";

            const normalizedRole = String(roleName).trim().toLowerCase();

            if (normalizedRole === 'admin') {
                badge.classList.add('bg-rose-50', 'text-rose-600', 'border-rose-200');
                dot.classList.add('bg-rose-500');
            } else if (normalizedRole === 'giáo viên' || normalizedRole === 'giao vien') {
                badge.classList.add('bg-amber-50', 'text-amber-600', 'border-amber-200');
                dot.classList.add('bg-amber-500');
            } else {
                badge.classList.add('bg-green-50', 'text-green-600', 'border-green-200');
                dot.classList.add('bg-green-500');
            }
        }

        onAuthChange(async (event, session) => {
            const user = session?.user ?? null;
            if (user) {
                currentUserId = user.id;

                // ✅ ONLINE TIMER - begin phiên (atomic trên DB, chống cộng khoảng offline / double-count)
                try {
                    await beginOnlineSession(user.id);
                } catch(e){}

                // Bắt đầu cập nhật online status và listener users
                startOnlineInterval();
                startUsersListener();

                // Kiểm tra xem có đang xem profile người khác không
                const urlParams = new URLSearchParams(window.location.search);
                const viewUserId = urlParams.get('user');

                if (viewUserId && viewUserId !== currentUserId) {
                    loadViewUserProfile(viewUserId);
                } else {
                    loadOwnProfile();
                }

            } else {
                console.log("Học viên chưa đăng nhập!");
                cleanup();
                window.location.href = "login.html";
            }
        });

        // Validate đầu vào hồ sơ trước khi lưu (chống lưu nội dung gây XSS).
        function validateProfileInput(p) {
            const name = String(p.name || "").trim();
            const bio = String(p.bio || "").trim();
            if (name.length > 60) return "Tên không được dài quá 60 ký tự.";
            if (bio.length > 200) return "Tiểu sử không được dài quá 200 ký tự.";
            if (/[<>]/.test(name)) return "Tên không được chứa ký tự < hoặc >.";
            if (/[<>]/.test(bio)) return "Tiểu sử không được chứa ký tự < hoặc >.";
            const photo = String(p.photo || "").trim();
            if (photo) {
                try {
                    const u = new URL(photo);
                    if (u.protocol !== "http:" && u.protocol !== "https:") {
                        return "URL ảnh không hợp lệ (chỉ chấp nhận http/https).";
                    }
                } catch (err) {
                    return "URL ảnh không hợp lệ (chỉ chấp nhận http/https).";
                }
            }
            return null;
        }

        window.saveSettings = function(e) {
            e.preventDefault();
            if (!currentUserId) return window.showToast("Lỗi: Không tìm thấy phiên đăng nhập!", "error");

            const inputBirthVal = document.getElementById('input-birth').value;

            const updatedProfile = {
                name: document.getElementById('input-name').value,
                photo: document.getElementById('input-avatar').value,
                bio: document.getElementById('input-bio').value,
                phone: document.getElementById('input-phone').value,
                birthdate: inputBirthVal,
                gender: document.getElementById('input-gender').value,
                school: document.getElementById('school-name-display').value,
                updated_at: new Date().toISOString()
            };

            const invalid = validateProfileInput(updatedProfile);
            if (invalid) return window.showToast(invalid, "error");

            supabase.from("users").update(updatedProfile).eq("id", currentUserId)
                .then(() => {
                    document.getElementById('profile-birth-display').innerText = formatDate(inputBirthVal);
                    window.showToast("Cài đặt hồ sơ của bạn đã được lưu lại thành công!", "success");
                    closeSettingsModal();
                })
                .catch((error) => {
                    window.showToast("Lỗi lưu dữ liệu: " + error.message, "error");
                });
        }

        window.sendForgotPasswordLink = async function() {
            try {
                const { data } = await supabase.auth.getUser();
                const email = data?.user?.email;
                if (!email) return window.showToast("Không tìm thấy email tài khoản!", "error");
                const base = window.location.origin + window.location.pathname;
                const redirectTo = base.substring(0, base.lastIndexOf("/") + 1) + "reset-password.html";
                const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
                if (error) throw error;
                window.showToast("Liên kết đặt lại mật khẩu đã được gửi đến " + email + "!", "success", "fa-envelope");

                // Đếm ngược 10s trước khi cho bấm lại
                const btn = document.querySelector('button[onclick="sendForgotPasswordLink()"]');
                if (btn) {
                    btn.disabled = true;
                    let countdown = 10;
                    const originalText = btn.textContent;
                    btn.textContent = `Gửi lại (${countdown}s)`;
                    const interval = setInterval(() => {
                        countdown--;
                        if (countdown > 0) {
                            btn.textContent = `Gửi lại (${countdown}s)`;
                        } else {
                            clearInterval(interval);
                            btn.disabled = false;
                            btn.textContent = originalText;
                        }
                    }, 1000);
                }
            } catch (error) {
                console.error("Gửi liên kết đặt lại mật khẩu lỗi:", error);
                window.showToast("Gửi liên kết đặt lại mật khẩu thất bại: " + error.message, "error");
            }
        };

        window.savePassword = function(e) {
            e.preventDefault();
            if (!currentUserId) return window.showToast("Lỗi: Không tìm thấy phiên đăng nhập!", "error");

            const oldPassword = document.getElementById('input-old-password').value;
            const textNewPassword = document.getElementById('input-new-password').value;
            const confirmPassword = document.getElementById('input-confirm-password').value;

            if (!oldPassword) return window.showToast("Vui lòng nhập mật khẩu cũ để xác minh!", "warning");
            if (textNewPassword !== confirmPassword) return window.showToast("Mật khẩu mới không trùng khớp!", "error");
            if (textNewPassword.length < 6) return window.showToast("Mật khẩu mới phải từ 6 ký tự trở lên!", "warning");

            const email = supabase.auth.getUser().then(({ data }) => data.user?.email).catch(() => null);
            email.then((userEmail) => {
                if (!userEmail) return window.showToast("Không tìm thấy email tài khoản!", "error");
                supabase.auth.signInWithPassword({ email: userEmail, password: oldPassword })
                    .then(({ error }) => {
                        if (error) return window.showToast("Mật khẩu cũ không chính xác!", "error");
                        supabase.auth.updateUser({ password: textNewPassword })
                            .then(() => {
                                window.showToast("Đổi mật khẩu tài khoản thành công!", "success");
                                document.getElementById('input-old-password').value = "";
                                document.getElementById('input-new-password').value = "";
                                document.getElementById('input-confirm-password').value = "";
                            })
                            .catch(err => window.showToast("Lỗi đổi mật khẩu: " + err.message, "error"));
                    });
            });
        }

        // ===== DELETE ACCOUNT =====
        const deleteConfirmInput = document.getElementById('input-delete-confirm');
        const deleteBtn = document.getElementById('btn-delete-account');
        if (deleteConfirmInput && deleteBtn) {
            deleteConfirmInput.addEventListener('input', function() {
                const ok = this.value.trim().toLowerCase() === 'xoa tai khoan';
                deleteBtn.style.opacity = ok ? '1' : '0.5';
                deleteBtn.style.pointerEvents = ok ? 'auto' : 'none';
            });
        }

        window.deleteOwnAccount = async function() {
            const password = document.getElementById('input-delete-password').value;
            const confirmText = document.getElementById('input-delete-confirm').value.trim().toLowerCase();

            if (!password) return window.showToast("Vui lòng nhập mật khẩu để xác nhận!", "warning");
            if (confirmText !== 'xoa tai khoan') return window.showToast("Vui lòng gõ 'xoa tai khoan' để xác nhận!", "warning");

            deleteBtn.disabled = true;
            deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Đang xử lý...';

            try {
                const { data: userData } = await supabase.auth.getUser();
                const userEmail = userData?.user?.email;
                if (!userEmail) throw new Error("Không tìm thấy tài khoản!");

                const { error: authError } = await supabase.auth.signInWithPassword({ email: userEmail, password: password });
                if (authError) throw new Error("Mật khẩu không chính xác!");

                const { error: deleteProfileError } = await supabase.from("users").delete().eq("id", currentUserId);
                if (deleteProfileError) console.warn("Xóa profile:", deleteProfileError.message);

                const { error: authDeleteError } = await supabase.rpc('delete_own_account');
                if (authDeleteError) {
                    console.warn("RPC delete_own_account:", authDeleteError.message);
                    await supabase.auth.signOut();
                } else {
                    await supabase.auth.signOut();
                }

                window.showToast("Tài khoản đã được xóa. Bạn sẽ thoát trong giây lát...", "success");
                setTimeout(() => { window.location.href = "login.html"; }, 2500);
            } catch (err) {
                window.showToast(err.message || "Không thể xóa tài khoản!", "error");
                deleteBtn.disabled = false;
                deleteBtn.innerHTML = '<i class="fas fa-trash-can mr-1"></i> Xóa tài khoản';
            }
        }
    