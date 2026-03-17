let button = document.getElementById("submit");
let reset = document.getElementById("reset");
let subBtn = document.getElementById("sub-btn");

let Name = document.getElementById("Name");
let Email = document.getElementById("email");
let pass = document.getElementById("password");
let loginEmail = document.getElementById("mail");
let loginPass = document.getElementById("pass");

users = JSON.parse(localStorage.getItem("users")) || [];

if(!window.showAppToast){
    (function initAppToast(){
        function ensureToastStyles(){
            if(document.getElementById("appToastStyles")) return;

            let style = document.createElement("style");
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
            let container = ensureToastContainer();
            let tone = ["success", "error", "warning", "info"].includes(type) ? type : "info";
            let duration = Number(options.duration) || (tone === "error" ? 3400 : 2600);

            let toast = document.createElement("div");
            toast.className = `app-toast app-toast--${tone}`;
            toast.setAttribute("role", "status");
            toast.textContent = String(message);
            container.appendChild(toast);

            requestAnimationFrame(() => {
                toast.classList.add("is-visible");
            });

            let dismissed = false;
            let dismiss = () => {
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

if(button){
let signupForm = button.closest("form");
if(signupForm){
    signupForm.addEventListener("submit", function(e){
        e.preventDefault();
        button.click();
    });
}

bindEnterToButton([Name, Email, pass], button);

button.addEventListener("click", function(e){
    e.preventDefault();

    let now = new Date();

    let user = {
        
        id: Date.now(),
        name: Name.value.trim(),
        email: Email.value.trim(),
        password: pass.value.trim(),
        avatar:"",
        bio:"",
        joinedDate: now.toISOString().trim(),
        lastLogin: now.toISOString().trim(),
        notes:[]
    };
    console.log(user);
   
    let alreadyExists = users.some(u => u.email === user.email);

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
        localStorage.setItem("users", JSON.stringify(users));
        showAppToast("User registered successfully.", "success");
        setTimeout(() => {
            window.location.href = "login.html";
        }, 450);
    }
});
}

if(subBtn){
let loginForm = subBtn.closest("form");
if(loginForm){
    loginForm.addEventListener("submit", function(e){
        e.preventDefault();
        subBtn.click();
    });
}

bindEnterToButton([loginEmail, loginPass], subBtn);

subBtn.addEventListener("click",(e) =>{
    e.preventDefault();

    let userEmail = document.getElementById("mail").value.trim();
    let userPass = document.getElementById("pass").value.trim();

    let validUser = users.find(u => u.email === userEmail);

    if(!validUser){
        showAppToast("Email not registered.", "error");
    }
    else if(validUser.password !== userPass){
        showAppToast("Incorrect password.", "error");
    }
    else{
        validUser.lastLogin = new Date().toISOString();
        localStorage.setItem("users", JSON.stringify(users));

        localStorage.setItem("currentUser", validUser.email);

        showAppToast("Login successful.", "success");
        setTimeout(() => {
            window.location.href = "notes.html";
        }, 450);
    }
});
}

if(reset){
reset.addEventListener("click", function(e){
   e.preventDefault();
   Name.value = "";
   Email.value = "";
   pass.value = "";
});
}
