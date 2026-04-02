(() => {
    const signupButton = document.getElementById("submit");
    const signupResetButton = document.getElementById("reset");
    const loginButton = document.getElementById("sub-btn");

    const signupNameInput = document.getElementById("Name");
    const signupEmailInput = document.getElementById("email");
    const signupPasswordInput = document.getElementById("password");
    const loginEmailInput = document.getElementById("mail");
    const loginPasswordInput = document.getElementById("pass");

    const authModal = document.getElementById("authModal");
    const authOpenButtons = document.querySelectorAll("[data-auth-open]");
    const authCloseButtons = document.querySelectorAll("[data-auth-close]");
    const authViewButtons = document.querySelectorAll("[data-auth-view]");
    const authPanels = document.querySelectorAll("[data-auth-panel]");

    let users = JSON.parse(localStorage.getItem("users")) || [];

    if(!window.showAppToast){
        (function initAppToast(){
            function ensureToastStyles(){
                if(document.getElementById("appToastStyles")) return;

                const style = document.createElement("style");
                style.id = "appToastStyles";
                style.textContent = `
                    #appToastContainer{
                        position: fixed;
                        top: 16px;
                        right: 16px;
                        z-index: 99999;
                        display: flex;
                        flex-direction: column;
                        gap: 10px;
                        width: min(360px, calc(100vw - 24px));
                        pointer-events: none;
                    }

                    .app-toast{
                        border-radius: 12px;
                        border: 1px solid rgba(148,163,184,0.35);
                        background: #0f172a;
                        color: #f8fafc;
                        box-shadow: 0 16px 28px rgba(2,6,23,0.3);
                        padding: 11px 13px;
                        line-height: 1.4;
                        font-size: 14px;
                        transform: translateX(116%);
                        opacity: 0;
                        transition: transform 0.28s ease, opacity 0.28s ease;
                        pointer-events: auto;
                    }

                    .app-toast.is-visible{
                        transform: translateX(0);
                        opacity: 1;
                    }

                    .app-toast.is-hiding{
                        transform: translateX(116%);
                        opacity: 0;
                    }

                    .app-toast--success{ border-left: 4px solid #22c55e; }
                    .app-toast--error{ border-left: 4px solid #ef4444; }
                    .app-toast--warning{ border-left: 4px solid #f59e0b; }
                    .app-toast--info{ border-left: 4px solid #3b82f6; }
                `;
                document.head.appendChild(style);
            }

            function ensureToastContainer(){
                let container = document.getElementById("appToastContainer");
                if(container) return container;

                container = document.createElement("div");
                container.id = "appToastContainer";
                container.setAttribute("aria-live", "polite");
                container.setAttribute("aria-atomic", "true");
                document.body.appendChild(container);
                return container;
            }

            window.showAppToast = function(message, type = "info", options = {}){
                if(!message) return;

                ensureToastStyles();
                const container = ensureToastContainer();
                const tone = ["success", "error", "warning", "info"].includes(type) ? type : "info";
                const duration = Number(options.duration) || (tone === "error" ? 3400 : 2600);

                const toast = document.createElement("div");
                toast.className = `app-toast app-toast--${tone}`;
                toast.setAttribute("role", "status");
                toast.textContent = String(message);
                container.appendChild(toast);

                requestAnimationFrame(() => {
                    toast.classList.add("is-visible");
                });

                let dismissed = false;
                const dismiss = () => {
                    if(dismissed) return;
                    dismissed = true;
                    toast.classList.remove("is-visible");
                    toast.classList.add("is-hiding");
                    setTimeout(() => {
                        toast.remove();
                    }, 280);
                };

                setTimeout(dismiss, duration);
                toast.addEventListener("click", dismiss);
            };
        })();
    }

    function bindEnterToButton(inputs, buttonRef){
        if(!buttonRef) return;

        (inputs || []).forEach(inputEl => {
            if(!inputEl) return;

            inputEl.addEventListener("keydown", function(e){
                if(e.key === "Enter"){
                    e.preventDefault();
                    buttonRef.click();
                }
            });
        });
    }

    function syncUsers(){
        localStorage.setItem("users", JSON.stringify(users));
    }

    function clearSignupForm(){
        if(signupNameInput) signupNameInput.value = "";
        if(signupEmailInput) signupEmailInput.value = "";
        if(signupPasswordInput) signupPasswordInput.value = "";
    }

    function setAuthView(view){
        const nextView = view === "signup" ? "signup" : "login";

        authPanels.forEach(panel => {
            panel.classList.toggle("is-active", panel.dataset.authPanel === nextView);
        });

        authViewButtons.forEach(button => {
            button.classList.toggle("is-active", button.dataset.authView === nextView);
        });

        const focusTarget = nextView === "signup" ? signupNameInput : loginEmailInput;
        if(focusTarget){
            setTimeout(() => {
                focusTarget.focus();
            }, 80);
        }
    }

    function openAuthModal(view = "login"){
        if(!authModal) return;

        authModal.hidden = false;
        authModal.setAttribute("aria-hidden", "false");
        document.body.classList.add("auth-modal-open");
        setAuthView(view);
    }

    function closeAuthModal(){
        if(!authModal || authModal.hidden) return;

        authModal.hidden = true;
        authModal.setAttribute("aria-hidden", "true");
        document.body.classList.remove("auth-modal-open");
    }

    function consumeAuthIntentFromQuery(){
        if(!authModal) return;

        const params = new URLSearchParams(window.location.search);
        const authTarget = params.get("auth");

        if(authTarget !== "login" && authTarget !== "signup") return;

        openAuthModal(authTarget);
        params.delete("auth");

        const nextQuery = params.toString();
        const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}${window.location.hash}`;
        window.history.replaceState({}, "", nextUrl);
    }

    authOpenButtons.forEach(button => {
        button.addEventListener("click", function(e){
            e.preventDefault();
            openAuthModal(button.dataset.authOpen || "login");
        });
    });

    authCloseButtons.forEach(button => {
        button.addEventListener("click", function(e){
            e.preventDefault();
            closeAuthModal();
        });
    });

    authViewButtons.forEach(button => {
        button.addEventListener("click", function(){
            setAuthView(button.dataset.authView || "login");
        });
    });

    document.addEventListener("keydown", function(e){
        if(e.key === "Escape"){
            closeAuthModal();
        }
    });

    if(signupButton){
        const signupForm = signupButton.closest("form");
        if(signupForm){
            signupForm.addEventListener("submit", function(e){
                e.preventDefault();
                signupButton.click();
            });
        }

        bindEnterToButton([signupNameInput, signupEmailInput, signupPasswordInput], signupButton);

        signupButton.addEventListener("click", function(e){
            e.preventDefault();

            const now = new Date();
            const user = {
                id: Date.now(),
                name: signupNameInput ? signupNameInput.value.trim() : "",
                email: signupEmailInput ? signupEmailInput.value.trim().toLowerCase() : "",
                password: signupPasswordInput ? signupPasswordInput.value.trim() : "",
                avatar: "",
                bio: "",
                joinedDate: now.toISOString().trim(),
                lastLogin: now.toISOString().trim(),
                notes: []
            };

            const alreadyExists = users.some(existingUser => existingUser.email === user.email);

            if(!user.name || !user.email || !user.password){
                showAppToast("Please fill all the fields.", "error");
            }
            else if(user.password.length < 6){
                showAppToast("Password must be at least 6 characters long.", "warning");
            }
            else if(!/\S+@\S+\.\S+/.test(user.email)){
                showAppToast("Please enter a valid email address.", "warning");
            }
            else if(alreadyExists){
                showAppToast("User already exists.", "error");
            }
            else{
                users.push(user);
                syncUsers();
                clearSignupForm();

                if(loginEmailInput){
                    loginEmailInput.value = user.email;
                }

                if(loginPasswordInput){
                    loginPasswordInput.value = "";
                }

                showAppToast("Account created. Please log in.", "success");

                if(authModal){
                    setAuthView("login");
                }
                else{
                    setTimeout(() => {
                        window.location.href = "login.html";
                    }, 420);
                }
            }
        });
    }

    if(loginButton){
        const loginForm = loginButton.closest("form");
        if(loginForm){
            loginForm.addEventListener("submit", function(e){
                e.preventDefault();
                loginButton.click();
            });
        }

        bindEnterToButton([loginEmailInput, loginPasswordInput], loginButton);

        loginButton.addEventListener("click", function(e){
            e.preventDefault();

            const userEmail = loginEmailInput ? loginEmailInput.value.trim().toLowerCase() : "";
            const userPassword = loginPasswordInput ? loginPasswordInput.value.trim() : "";
            const validUser = users.find(existingUser => existingUser.email === userEmail);

            if(!validUser){
                showAppToast("Email not registered.", "error");
            }
            else if(validUser.password !== userPassword){
                showAppToast("Incorrect password.", "error");
            }
            else{
                validUser.lastLogin = new Date().toISOString();
                syncUsers();
                localStorage.setItem("currentUser", validUser.email);
                showAppToast("Login successful.", "success");

                setTimeout(() => {
                    window.location.href = "notes.html";
                }, 360);
            }
        });
    }

    if(signupResetButton){
        signupResetButton.addEventListener("click", function(e){
            e.preventDefault();
            clearSignupForm();
        });
    }

    consumeAuthIntentFromQuery();
})();
