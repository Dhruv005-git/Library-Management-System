document.addEventListener("DOMContentLoaded", function () {
    const loginForm = document.getElementById("login-form");
    const registerForm = document.getElementById("register-form");
    const loginSection = document.getElementById("login-section");
    const registerSection = document.getElementById("register-section");
    const showRegisterLink = document.getElementById("show-register");
    const showLoginLink = document.getElementById("show-login");

    // Show Register Form
    showRegisterLink.addEventListener("click", function (event) {
        event.preventDefault();
        loginSection.style.display = "none";
        registerSection.style.display = "block";
    });

    // Show Login Form
    showLoginLink.addEventListener("click", function (event) {
        event.preventDefault();
        registerSection.style.display = "none";
        loginSection.style.display = "block";
    });

    // Login Form Submission
    loginForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value; 
        const role = document.querySelector('input[name="role"]:checked').value;

        try {
            const response = await fetch("http://127.0.0.1:5500/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password, role }) 
            });

            if (!response.ok) throw new Error("Invalid credentials! Try again.");
            const data = await response.json();

            if (role === "admin") {
    // Store admin info
            sessionStorage.setItem("user", JSON.stringify(data.user));
            sessionStorage.setItem("userName", data.user.firstName); // must match AdminDashboard check
            sessionStorage.setItem("token", data.token);

            // Redirect after session is set
            window.location.href = "../AdminDashboard/admin_dashboard.html";
            } else {
            // Store user info
            sessionStorage.setItem("memberId", data.user.memberId);
            sessionStorage.setItem("user", JSON.stringify(data.user));
            sessionStorage.setItem("token", data.token);

            window.location.href = "../UserDashboard/user_dashboard.html";
            }
        } catch (error) {
            alert(error.message || "Something went wrong. Please try again.");
        }
    });

    // Register Form Submission
    registerForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const firstName = document.getElementById("reg-firstname").value;
        const lastName = document.getElementById("reg-lastname").value;
        const email = document.getElementById("reg-email").value;
        const phone = document.getElementById("reg-phone").value;
        const address = document.getElementById("reg-address").value;

        try {
            const response = await fetch("http://127.0.0.1:5500/api/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ firstName, lastName, email, phone, address })
            });

            if (!response.ok) throw new Error("Registration failed. Try again.");
            alert("Registration successful! You can now log in.");

            registerSection.style.display = "none";
            loginSection.style.display = "block";
        } catch (error) {
            alert(error.message || "Member already exists!");
        }
    });
});
