"use strict";

const AFC_WEB_APP_URL =
    "https://script.google.com/macros/s/AKfycbyC1UQzxp4ikxVpBbg5D0TJDxx4AU-iEqh4Z9Cigeb0HAUzNYnQGihpPPKi7QDC2pgb4A/exec";

const AFCAuth = (() => {
    const TOKEN_KEY = "afc_auth_token";
    const USER_KEY = "afc_auth_user";
    const originalFetch = window.fetch.bind(window);

    function token() {
        return localStorage.getItem(TOKEN_KEY) || "";
    }

    function user() {
        try {
            return JSON.parse(localStorage.getItem(USER_KEY) || "null");
        } catch {
            return null;
        }
    }

    function saveSession(data) {
        localStorage.setItem(TOKEN_KEY, data.token);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    }

    function clearSession() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
    }

    function projectRootPath() {
        const pathname = window.location.pathname;
        const pagesIndex = pathname.lastIndexOf("/pages/");
        return pagesIndex >= 0 ? pathname.slice(0, pagesIndex + 1) : pathname.replace(/[^/]*$/, "");
    }

    function loginUrl(returnPath = "") {
        const rootPath = projectRootPath();
        const target = returnPath || window.location.pathname;
        return `${rootPath}index.html?return=${encodeURIComponent(target)}`;
    }

    function goToLogin() {
        window.location.replace(loginUrl());
    }

    function dashboardUrl() {
        return `${projectRootPath()}pages/dashboard.html`;
    }

    async function verify() {
        const currentToken = token();

        if (!currentToken) {
            goToLogin();
            return null;
        }

        const url = new URL(AFC_WEB_APP_URL);
        url.searchParams.set("action", "verifySession");
        url.searchParams.set("token", currentToken);
        url.searchParams.set("_", Date.now());

        try {
            const response = await originalFetch(url.toString(), {
                cache: "no-store",
                redirect: "follow"
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || "Session expired.");
            }

            localStorage.setItem(USER_KEY, JSON.stringify(result.data));
            renderUser(result.data);
            applyMenuPermissions(result.data);
            return result.data;
        } catch (error) {
            console.error("Session verification failed:", error);
            clearSession();
            goToLogin();
            return null;
        }
    }

    function hasPermission(permission) {
        const currentUser = user();

        if (!currentUser) return false;
        if (String(currentUser.role || "").toUpperCase() === "ADMIN") return true;

        return Array.isArray(currentUser.permissions) &&
            currentUser.permissions.includes(permission);
    }

    async function requirePermission(permission) {
        const currentUser = await verify();
        if (!currentUser) return false;

        if (!hasPermission(permission)) {
            document.body.innerHTML = `
                <div style="max-width:650px;margin:80px auto;padding:30px;
                            font-family:Segoe UI;background:white;border-radius:10px;
                            box-shadow:0 4px 20px rgba(0,0,0,.15);text-align:center;">
                    <h2 style="color:#b02a37;">Access Denied</h2>
                    <p>You do not have permission to open this page.</p>
                    <a href="${dashboardUrl()}">Return to Dashboard</a>
                </div>`;
            return false;
        }

        return true;
    }

    async function logout() {
        try {
            await originalFetch(AFC_WEB_APP_URL, {
                method: "POST",
                redirect: "follow",
                headers: {
                    "Content-Type": "text/plain;charset=utf-8"
                },
                body: JSON.stringify({
                    action: "logout",
                    token: token()
                })
            });
        } catch (error) {
            console.warn("Logout request failed:", error);
        }

        clearSession();
        window.location.replace(loginUrl(""));
    }

    function renderUser(currentUser) {
        if (!currentUser) return;

        let box = document.getElementById("afcUserBox");

        if (!box) {
            const sidebar = document.querySelector(".sidebar");
            if (!sidebar) return;

            box = document.createElement("div");
            box.id = "afcUserBox";
            box.style.cssText =
                "margin-top:25px;padding-top:15px;border-top:1px solid rgba(255,255,255,.25);font-size:12px;";
            sidebar.appendChild(box);
        }

        box.innerHTML = `
            <div style="font-weight:700;">
                ${escapeHtml(currentUser.name || currentUser.userId)}
            </div>
            <div style="opacity:.8;margin:3px 0 9px;">
                ${escapeHtml(currentUser.role || "")}
            </div>
            <button type="button" onclick="AFCAuth.logout()"
                    style="width:100%;border:0;padding:8px;border-radius:5px;
                           background:#dc3545;color:white;font-weight:600;cursor:pointer;">
                <i class="fas fa-sign-out-alt"></i> Logout
            </button>`;
    }

    function applyMenuPermissions() {
        const menuMap = {
            "asset_master.html": "add_asset",
            "search.html": "search",
            "spare_movement.html": "spare_movement",
            "spare_inventory.html": "spare_inventory",
            "reports.html": "reports",
            "users.html": "users",
            "settings.html": "settings"
        };

        document.querySelectorAll(".sidebar a[href]").forEach(link => {
            const href = (link.getAttribute("href") || "").split("/").pop();
            const permission = menuMap[href];

            if (permission && !hasPermission(permission)) {
                link.style.display = "none";
            }
        });
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Automatically attach token to all Apps Script requests.
    window.fetch = async function(resource, options = {}) {
        const urlText = typeof resource === "string"
            ? resource
            : (resource && resource.url ? resource.url : "");

        if (!urlText.startsWith(AFC_WEB_APP_URL)) {
            return originalFetch(resource, options);
        }

        const currentToken = token();
        const method = String(options.method || "GET").toUpperCase();

        if (method === "POST") {
            let payload = {};

            try {
                payload = options.body ? JSON.parse(options.body) : {};
            } catch {
                payload = {};
            }

            payload.token = currentToken;

            return originalFetch(resource, {
                ...options,
                redirect: "follow",
                headers: {
                    ...(options.headers || {}),
                    "Content-Type": "text/plain;charset=utf-8"
                },
                body: JSON.stringify(payload)
            });
        }

        const url = new URL(urlText);
        url.searchParams.set("token", currentToken);
        return originalFetch(url.toString(), options);
    };

    return {
        token,
        user,
        saveSession,
        clearSession,
        verify,
        requirePermission,
        hasPermission,
        logout,
        dashboardUrl,
        loginUrl
    };
})();
