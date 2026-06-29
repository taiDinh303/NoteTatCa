
document.querySelectorAll(".password-toggle")
    .forEach(btn => {

        btn.addEventListener("click", () => {

            const input =
                document.getElementById(btn.dataset.target);

            const isPassword =
                input.type === "password";

            input.type =
                isPassword ? "text" : "password";

            if (btn.querySelector("i")) {

                btn.innerHTML =
                    isPassword
                        ? '<i class="bi bi-eye-slash"></i>'
                        : '<i class="bi bi-eye"></i>';

            } else {

                btn.textContent =
                    isPassword ? "🙈" : "👁";

            }
        });

    });